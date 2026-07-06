import { useMemo, useState } from 'react'

export type SortDir = 'asc' | 'desc'

/** Generic client-side sort for a table — pass a key→value getter, get back a sorted array plus a toggle handler for column headers. */
export function useSort<T, K extends string>(
  items: T[],
  getValue: (item: T, key: K) => string | number,
  initialKey: K,
  initialDir: SortDir = 'asc',
) {
  const [sortKey, setSortKey] = useState<K>(initialKey)
  const [sortDir, setSortDir] = useState<SortDir>(initialDir)

  const sorted = useMemo(() => {
    const copy = [...items]
    copy.sort((a, b) => {
      const av = getValue(a, sortKey)
      const bv = getValue(b, sortKey)
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'pt-BR')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sortKey, sortDir])

  function toggleSort(key: K) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return { sorted, sortKey, sortDir, toggleSort }
}
