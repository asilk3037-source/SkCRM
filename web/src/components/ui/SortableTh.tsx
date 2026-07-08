import { SortableLabel } from './SortableLabel'
import type { SortDir } from '../../lib/useSort'

/** Clickable table header cell that reports its own sort state — pairs with the useSort hook. */
export function SortableTh<K extends string>({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string
  sortKey: K
  active: boolean
  dir: SortDir
  onClick: (key: K) => void
}) {
  return (
    <th className="px-4 py-3 font-medium">
      <SortableLabel label={label} sortKey={sortKey} active={active} dir={dir} onClick={onClick} />
    </th>
  )
}
