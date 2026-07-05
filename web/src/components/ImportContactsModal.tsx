import { useRef, useState } from 'react'
import { parseCsvWithHeader } from '../lib/csv'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import type { Contact, Company } from '../types/database'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Alert } from './ui/Alert'

type ParsedFields = { name: string; email: string; phone: string; job_title: string; company: string }
type Row = ParsedFields & { duplicate: boolean }

const COLUMN_HINTS: Record<keyof ParsedFields, string[]> = {
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
  const { data: existingContacts, create: createContact } = useSupabaseTable<Contact>('contacts')
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

      const existingEmails = new Set(
        existingContacts.filter((c) => c.email).map((c) => c.email!.toLowerCase()),
      )
      const seenInFile = new Set<string>()
      const mapped = parsed
        .map((r) => ({
          name: r[nameCol] ?? '',
          email: emailCol ? (r[emailCol] ?? '') : '',
          phone: phoneCol ? (r[phoneCol] ?? '') : '',
          job_title: jobCol ? (r[jobCol] ?? '') : '',
          company: companyCol ? (r[companyCol] ?? '') : '',
        }))
        .filter((r) => r.name)
        .map((r) => {
          const email = r.email.trim().toLowerCase()
          const duplicate = !!email && (existingEmails.has(email) || seenInFile.has(email))
          if (email) seenInFile.add(email)
          return { ...r, duplicate }
        })
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
    // Local map (not the reactive `companies` state, which won't reflect inserts made
    // earlier in this same loop) so two rows naming the same new company only create it once.
    const companyByName = new Map(companies.map((c) => [c.name.toLowerCase(), c.id]))
    try {
      for (const row of rows) {
        if (row.duplicate) {
          skipped++
          continue
        }
        let companyId: string | null = null
        if (row.company) {
          const key = row.company.toLowerCase()
          const existingId = companyByName.get(key)
          if (existingId) {
            companyId = existingId
          } else {
            const newCompany = await createCompany({ name: row.company } as Partial<Company>)
            companyByName.set(key, newCompany.id)
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
    <Modal
      title="Importar contatos (CSV)"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {done ? 'Fechar' : 'Cancelar'}
          </Button>
          {!done && (
            <Button onClick={handleImport} disabled={rows.length === 0 || importing}>
              {importing ? 'Importando...' : `Importar ${rows.length || ''} contato(s)`}
            </Button>
          )}
        </>
      }
    >
      <div className="p-5">
        {!done && (
          <>
            <p className="mb-3 text-sm text-slate-500">
              O arquivo precisa ter uma primeira linha de cabeçalho com pelo menos uma coluna de nome
              (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">nome</code> ou{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">name</code>). Colunas opcionais reconhecidas:{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">email</code>,{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">telefone</code>,{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">cargo</code>,{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">empresa</code>.
            </p>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              {fileName || 'Escolher arquivo CSV'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </>
        )}

        {error && (
          <div className="mt-3">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        {done && (
          <Alert tone="success">
            {done.created} contato(s) importado(s){done.skipped > 0 ? `, ${done.skipped} ignorado(s) por erro` : ''}.
          </Alert>
        )}

        {rows.length > 0 && !done && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Pré-visualização ({rows.length} contatos
              {rows.some((r) => r.duplicate) ? `, ${rows.filter((r) => r.duplicate).length} com e-mail duplicado` : ''})
            </p>
            <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">E-mail</th>
                    <th className="px-3 py-2 font-medium">Telefone</th>
                    <th className="px-3 py-2 font-medium">Empresa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className={r.duplicate ? 'bg-amber-50 text-amber-800' : undefined}>
                      <td className="px-3 py-1.5">{r.name}</td>
                      <td className="px-3 py-1.5">
                        {r.email}
                        {r.duplicate && <span className="ml-1 text-[10px]">(duplicado, será ignorado)</span>}
                      </td>
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
    </Modal>
  )
}
