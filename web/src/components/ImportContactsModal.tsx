import { useRef, useState } from 'react'
import { parseCsvWithHeader } from '../lib/csv'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import type { Contact, Company } from '../types/database'

type Row = { name: string; email: string; phone: string; job_title: string; company: string }

const COLUMN_HINTS: Record<keyof Row, string[]> = {
  name: ['nome', 'name'],
  email: ['email', 'e-mail'],
  phone: ['telefone', 'phone', 'celular'],
  job_title: ['cargo', 'job_title', 'função', 'funcao'],
  company: ['empresa', 'company'],
}

function guessColumn(headers: string[], hints: string[]) {
  return headers.find((h) => hints.includes(h))
}

export function ImportContactsModal({ onClose }: { onClose: () => void }) {
  const { create: createContact } = useSupabaseTable<Contact>('contacts')
  const { data: companies, create: createCompany } = useSupabaseTable<Company>('companies', 'name')
  const [rows, setRows] = useState<Row[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setDone(null)
    setFileName(file.name)
    try {
      const text = await file.text()
      const parsed = parseCsvWithHeader(text)
      if (parsed.length === 0) {
        setError('Não encontrei linhas de dados nesse arquivo.')
        setRows([])
        return
      }
      const headers = Object.keys(parsed[0])
      const nameCol = guessColumn(headers, COLUMN_HINTS.name)
      if (!nameCol) {
        setError('Não encontrei uma coluna de nome (esperado: "nome" ou "name"). Verifique o cabeçalho do CSV.')
        setRows([])
        return
      }
      const emailCol = guessColumn(headers, COLUMN_HINTS.email)
      const phoneCol = guessColumn(headers, COLUMN_HINTS.phone)
      const jobCol = guessColumn(headers, COLUMN_HINTS.job_title)
      const companyCol = guessColumn(headers, COLUMN_HINTS.company)

      const mapped = parsed
        .map((r) => ({
          name: r[nameCol] ?? '',
          email: emailCol ? (r[emailCol] ?? '') : '',
          phone: phoneCol ? (r[phoneCol] ?? '') : '',
          job_title: jobCol ? (r[jobCol] ?? '') : '',
          company: companyCol ? (r[companyCol] ?? '') : '',
        }))
        .filter((r) => r.name)
      setRows(mapped)
    } catch {
      setError('Não consegui ler esse arquivo. Confirme que é um CSV de texto.')
    }
  }

  async function handleImport() {
    setImporting(true)
    setError(null)
    let created = 0
    let skipped = 0
    try {
      for (const row of rows) {
        let companyId: string | null = null
        if (row.company) {
          const existing = companies.find((c) => c.name.toLowerCase() === row.company.toLowerCase())
          if (existing) {
            companyId = existing.id
          } else {
            const newCompany = await createCompany({ name: row.company } as Partial<Company>)
            companyId = newCompany.id
          }
        }
        try {
          await createContact({
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            job_title: row.job_title || null,
            company_id: companyId,
          } as Partial<Contact>)
          created++
        } catch {
          skipped++
        }
      }
      setDone({ created, skipped })
      setRows([])
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">Importar contatos (CSV)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        <div className="p-5">
          {!done && (
            <>
              <p className="mb-3 text-sm text-slate-500">
                O arquivo precisa ter uma primeira linha de cabeçalho com pelo menos uma coluna de nome
                (<code>nome</code> ou <code>name</code>). Colunas opcionais reconhecidas:{' '}
                <code>email</code>, <code>telefone</code>, <code>cargo</code>, <code>empresa</code>.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {fileName || 'Escolher arquivo CSV'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </>
          )}

          {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {done && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {done.created} contato(s) importado(s){done.skipped > 0 ? `, ${done.skipped} ignorado(s) por erro` : ''}.
            </p>
          )}

          {rows.length > 0 && !done && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Pré-visualização ({rows.length} contatos)</p>
              <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">E-mail</th>
                      <th className="px-3 py-2">Telefone</th>
                      <th className="px-3 py-2">Empresa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5">{r.email}</td>
                        <td className="px-3 py-1.5">{r.phone}</td>
                        <td className="px-3 py-1.5">{r.company}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 50 && (
                <p className="mt-1 text-xs text-slate-400">Mostrando os 50 primeiros de {rows.length}.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {done ? 'Fechar' : 'Cancelar'}
          </button>
          {!done && (
            <button
              onClick={handleImport}
              disabled={rows.length === 0 || importing}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {importing ? 'Importando...' : `Importar ${rows.length || ''} contato(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
