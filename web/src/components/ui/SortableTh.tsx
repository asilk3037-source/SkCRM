import type { ReactNode } from 'react'
import { IconArrowUpDown, IconChevronDown } from './icons'
import type { SortDir } from '../../lib/useSort'

/** Clickable table header cell that reports its own sort state — pairs with the useSort hook. */
export function SortableTh<K extends string>({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: ReactNode
  sortKey: K
  active: boolean
  dir: SortDir
  onClick: (key: K) => void
}) {
  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className="flex items-center gap-1 whitespace-nowrap text-inherit hover:text-slate-700"
      >
        {label}
        {active ? (
          <IconChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${dir === 'asc' ? 'rotate-180' : ''}`} />
        ) : (
          <IconArrowUpDown className="h-3.5 w-3.5 text-slate-300" />
        )}
      </button>
    </th>
  )
}
