import { useState, type FormEvent } from 'react'
import { useCompanySlaSettings } from '../hooks/useCompanySlaSettings'
import { useToast } from './ToastProvider'
import type { TicketPriority } from '../types/database'
import { PRIORITY_LABEL } from '../lib/ticketMeta'
import { Button } from './ui/Button'
import { Card, CardHeader } from './ui/Card'
import { FieldGroup, Input } from './ui/Field'
import { Alert } from './ui/Alert'
import { IconClock } from './ui/icons'

const PRIORITIES: TicketPriority[] = ['baixa', 'media', 'alta', 'urgente']

/** Cada empresa tem seu próprio prazo — sem valor definido para uma prioridade, os chamados dela simplesmente não mostram indicador de atraso (ver docs/DECISOES_PENDENTES.md item 3). */
export function CompanySlaCard({ companyId, canManage }: { companyId: string; canManage: boolean }) {
  const { settings, loading, upsert, remove } = useCompanySlaSettings(companyId)
  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState<Record<TicketPriority, string>>({ baixa: '', media: '', alta: '', urgente: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function startEdit() {
    const next: Record<TicketPriority, string> = { baixa: '', media: '', alta: '', urgente: '' }
    for (const p of PRIORITIES) {
      const found = settings.find((s) => s.priority === p)
      if (found) next[p] = String(found.hours_limit)
    }
    setHours(next)
    setError(null)
    setEditing(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      for (const p of PRIORITIES) {
        const raw = hours[p].trim()
        if (!raw) {
          await remove(p)
          continue
        }
        const value = Number(raw)
        if (!Number.isFinite(value) || value <= 0) {
          throw new Error(`Prazo inválido para "${PRIORITY_LABEL[p]}" — use um número de horas maior que zero.`)
        }
        await upsert(p, value)
      }
      setEditing(false)
      toast('Prazos de SLA salvos.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar os prazos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconClock className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Prazos de atendimento (SLA)</h2>
          </div>
          {canManage && !editing && (
            <Button size="sm" variant="secondary" onClick={startEdit}>
              {settings.length ? 'Editar prazos' : 'Configurar prazos'}
            </Button>
          )}
        </div>
      </CardHeader>

      {editing ? (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          {PRIORITIES.map((p) => (
            <FieldGroup key={p} label={`${PRIORITY_LABEL[p]} (horas)`}>
              <Input
                type="number"
                min={1}
                placeholder="Sem prazo"
                value={hours[p]}
                onChange={(e) => setHours({ ...hours, [p]: e.target.value })}
              />
            </FieldGroup>
          ))}
          {error && (
            <div className="col-span-2 sm:col-span-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          <div className="col-span-2 flex gap-2 sm:col-span-4">
            <Button type="submit" disabled={saving}>
              Salvar prazos
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : loading ? null : settings.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">
          Nenhum prazo configurado para esta empresa ainda — sem SLA definido, os chamados dela não mostram indicador de atraso.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          {PRIORITIES.map((p) => {
            const s = settings.find((item) => item.priority === p)
            return (
              <div key={p}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{PRIORITY_LABEL[p]}</p>
                <p className="mt-0.5 text-sm text-slate-700">{s ? `${s.hours_limit}h` : 'Sem prazo'}</p>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
