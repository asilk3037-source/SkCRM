import { useState, type FormEvent } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import type { Task } from '../types/database'

const emptyForm = { title: '', description: '', due_date: '' }

export function Tasks() {
  const { data: tasks, loading, create, update, remove } = useSupabaseTable<Task>('tasks', 'due_date')
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
  }

  const pending = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Tarefas</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showForm ? 'Cancelar' : 'Nova tarefa'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-5">
          <input
            required
            placeholder="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="col-span-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Adicionar
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              Pendentes ({pending.length})
            </h2>
            <ul className="divide-y divide-slate-100">
              {pending.map((task) => (
                <li key={task.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <input type="checkbox" checked={false} onChange={() => update(task.id, { done: true })} />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{task.title}</p>
                    {task.description && <p className="text-xs text-slate-500">{task.description}</p>}
                  </div>
                  {task.due_date && (
                    <span className="text-xs text-slate-400">{new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
                  )}
                  <button onClick={() => remove(task.id)} className="text-red-500 hover:text-red-700">
                    Excluir
                  </button>
                </li>
              ))}
              {pending.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Nenhuma tarefa pendente.</li>}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              Concluídas ({done.length})
            </h2>
            <ul className="divide-y divide-slate-100">
              {done.map((task) => (
                <li key={task.id} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-400">
                  <input type="checkbox" checked={true} onChange={() => update(task.id, { done: false })} />
                  <span className="flex-1 line-through">{task.title}</span>
                  <button onClick={() => remove(task.id)} className="text-red-400 hover:text-red-600">
                    Excluir
                  </button>
                </li>
              ))}
              {done.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Nenhuma tarefa concluída.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
