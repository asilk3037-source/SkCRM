import { useState, type FormEvent } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useOrg } from '../context/OrgContext'
import { useConfirm } from '../components/ConfirmDialog'
import { useToast } from '../components/ToastProvider'
import type { Task } from '../types/database'
import { can } from '../lib/permissions'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { FieldGroup, Input, Textarea } from '../components/ui/Field'
import { EmptyState } from '../components/ui/EmptyState'
import { PageLoading } from '../components/ui/Spinner'
import { LoadError } from '../components/ui/LoadError'
import { Badge } from '../components/ui/Badge'
import { IconCheckSquare, IconPlus } from '../components/ui/icons'

const emptyForm = { title: '', description: '', due_date: '' }

export function Tasks() {
  const { data: tasks, loading, error: loadError, refresh, create, update, remove } = useSupabaseTable<Task>('tasks', 'due_date')
  const { role } = useOrg()
  const canDelete = can(role, 'tasks', 'delete')
  const confirm = useConfirm()
  const toast = useToast()
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await create({
      title: form.title,
      description: form.description || null,
      due_date: form.due_date || null,
      done: false,
    })
    setForm(emptyForm)
    setShowForm(false)
    toast('Tarefa adicionada.')
  }

  async function handleRemove(task: Task) {
    if (await confirm({ description: `Excluir a tarefa "${task.title}"?` })) {
      await remove(task.id)
      toast('Tarefa excluída.')
    }
  }

  const pending = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)
  const isLate = (task: Task) => !!task.due_date && new Date(task.due_date) < new Date(new Date().toDateString())

  return (
    <div>
      <PageHeader
        eyebrow="Sua agenda"
        title="Tarefas"
        actions={
          <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : (
              <>
                <IconPlus className="h-4 w-4" /> Nova tarefa
              </>
            )}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Título" className="sm:col-span-2">
              <Input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Prazo">
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Descrição" className="sm:col-span-2">
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FieldGroup>
            <div className="sm:col-span-2">
              <Button type="submit">Adicionar</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <PageLoading />
      ) : loadError ? (
        <LoadError message={loadError} onRetry={refresh} />
      ) : (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-700">Pendentes</h2>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{pending.length}</span>
              </div>
            </CardHeader>
            {pending.length === 0 ? (
              <EmptyState icon={<IconCheckSquare className="h-5 w-5" />} title="Nenhuma tarefa pendente." compact />
            ) : (
              <ul className="divide-y divide-slate-100">
                {pending.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => update(task.id, { done: true })}
                      className="h-4 w-4 flex-shrink-0 rounded border-slate-300 text-orange-600 focus:ring-orange-400"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{task.title}</p>
                      {task.description && <p className="truncate text-xs text-slate-500">{task.description}</p>}
                    </div>
                    {task.due_date && (
                      <Badge tone={isLate(task) ? 'red' : 'slate'}>
                        {new Date(task.due_date).toLocaleDateString('pt-BR')}
                        {isLate(task) ? ' · atrasada' : ''}
                      </Badge>
                    )}
                    {canDelete && (
                      <Button variant="danger" size="xs" onClick={() => handleRemove(task)}>
                        Excluir
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-700">Concluídas</h2>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{done.length}</span>
              </div>
            </CardHeader>
            {done.length === 0 ? (
              <EmptyState title="Nenhuma tarefa concluída." compact />
            ) : (
              <ul className="divide-y divide-slate-100">
                {done.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => update(task.id, { done: false })}
                      className="h-4 w-4 flex-shrink-0 rounded border-slate-300 text-orange-600 focus:ring-orange-400"
                    />
                    <span className="flex-1 truncate line-through">{task.title}</span>
                    {canDelete && (
                      <Button variant="danger" size="xs" onClick={() => handleRemove(task)}>
                        Excluir
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
