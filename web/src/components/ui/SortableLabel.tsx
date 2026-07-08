import { IconArrowUpDown, IconChevronDown } from './icons'
import type { SortDir } from '../../lib/useSort'

/** Clickable sort-toggle label — shared by SortableTh (table headers) and any non-table list header that needs the same control. */
export function SortableLabel<K extends string>({
  label,
  sortKey,
  active,
  dir,
  onClick,
  className = '',
}: {
  label: string
  sortKey: K
  active: boolean
  dir: SortDir
  onClick: (key: K) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={`flex items-center gap-1 whitespace-nowrap text-inherit hover:text-slate-700 ${className}`}
    >
      {label}
      {active ? (
        <IconChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${dir === 'asc' ? 'rotate-180' : ''}`} />
      ) : (
        <IconArrowUpDown className="h-3.5 w-3.5 text-slate-300" />
      )}
    </button>
  )
}
