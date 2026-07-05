import { Button } from './Button'

export function Pagination({
  page,
  pageCount,
  totalItems,
  onChange,
}: {
  page: number
  pageCount: number
  totalItems: number
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
      <span>
        Página {page + 1} de {pageCount} · {totalItems} registro(s)
      </span>
      <div className="flex gap-1.5">
        <Button variant="secondary" size="xs" disabled={page === 0} onClick={() => onChange(page - 1)}>
          Anterior
        </Button>
        <Button variant="secondary" size="xs" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>
          Próxima
        </Button>
      </div>
    </div>
  )
}

/** Slices an array to the current page — pair with <Pagination>. */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice(page * pageSize, page * pageSize + pageSize)
}
