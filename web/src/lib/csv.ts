/** Minimal RFC 4180 CSV parser — handles quoted fields, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  // Normalize line endings so \r\n inside quotes doesn't produce stray \r.
  const src = text.replace(/\r\n/g, '\n')

  for (let i = 0; i < src.length; i++) {
    const char = src[i]

    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

/** Parses a CSV with a header row into an array of objects keyed by header. */
export function parseCsvWithHeader(text: string): Array<Record<string, string>> {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const [header, ...body] = rows
  const keys = header.map((h) => h.trim().toLowerCase())
  return body.map((row) => Object.fromEntries(keys.map((key, i) => [key, (row[i] ?? '').trim()])))
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Builds a CSV string (with header row) from an array of label→value rows. */
export function toCsv(rows: Array<Record<string, string>>, headers: Array<{ key: string; label: string }>): string {
  const headerLine = headers.map((h) => csvEscape(h.label)).join(',')
  const lines = rows.map((row) => headers.map((h) => csvEscape(row[h.key] ?? '')).join(','))
  return [headerLine, ...lines].join('\r\n')
}

/** Triggers a browser download of a CSV string. Prefixes a BOM so Excel opens UTF-8 accents correctly. */
export function downloadCsv(filename: string, csv: string) {
  const BOM = '﻿'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
