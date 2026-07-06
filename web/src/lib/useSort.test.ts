import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSort } from './useSort'

type Row = { id: number; name: string; amount: number }
type Key = 'name' | 'amount'

const rows: Row[] = [
  { id: 1, name: 'Carlos', amount: 30 },
  { id: 2, name: 'Ana', amount: 10 },
  { id: 3, name: 'Bruno', amount: 20 },
]

function getValue(row: Row, key: Key) {
  return row[key]
}

describe('useSort', () => {
  it('sorts ascending by the initial key by default', () => {
    const { result } = renderHook(() => useSort<Row, Key>(rows, getValue, 'name'))
    expect(result.current.sorted.map((r) => r.name)).toEqual(['Ana', 'Bruno', 'Carlos'])
    expect(result.current.sortDir).toBe('asc')
  })

  it('reverses direction when the same column is toggled twice', () => {
    const { result } = renderHook(() => useSort<Row, Key>(rows, getValue, 'name'))
    act(() => result.current.toggleSort('name'))
    expect(result.current.sortDir).toBe('desc')
    expect(result.current.sorted.map((r) => r.name)).toEqual(['Carlos', 'Bruno', 'Ana'])
  })

  it('switches to ascending when a new column is selected', () => {
    const { result } = renderHook(() => useSort<Row, Key>(rows, getValue, 'name'))
    act(() => result.current.toggleSort('name')) // now desc on name
    act(() => result.current.toggleSort('amount')) // switch column -> resets to asc
    expect(result.current.sortKey).toBe('amount')
    expect(result.current.sortDir).toBe('asc')
    expect(result.current.sorted.map((r) => r.amount)).toEqual([10, 20, 30])
  })

  it('sorts numerically, not lexicographically, for numeric values', () => {
    const rowsWithBigNumbers: Row[] = [
      { id: 1, name: 'a', amount: 9 },
      { id: 2, name: 'b', amount: 10 },
      { id: 3, name: 'c', amount: 2 },
    ]
    const { result } = renderHook(() => useSort<Row, Key>(rowsWithBigNumbers, getValue, 'amount'))
    // Lexicographic sort would put 10 before 2; numeric sort must not.
    expect(result.current.sorted.map((r) => r.amount)).toEqual([2, 9, 10])
  })

  it('does not mutate the original array', () => {
    const original = [...rows]
    renderHook(() => useSort<Row, Key>(rows, getValue, 'name'))
    expect(rows).toEqual(original)
  })
})
