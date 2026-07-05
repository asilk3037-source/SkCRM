/** Aceita URLs sem esquema (ex: "empresa.com") e completa com https:// */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true
  try {
    const url = new URL(normalizeUrl(value))
    return !!url.hostname && url.hostname.includes('.')
  } catch {
    return false
  }
}

/** Telefone BR: aceita only-digits com DDD, 10 (fixo) ou 11 (celular) dígitos. */
export function isValidPhoneBR(value: string): boolean {
  if (!value.trim()) return true
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 || digits.length === 11
}

/** Formata progressivamente enquanto o usuário digita: (11) 91234-5678 */
export function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function isStrongPassword(value: string): boolean {
  return value.length >= 8 && /[a-zA-Z]/.test(value) && /[0-9]/.test(value)
}

/** Mensagem amigável para violação de unicidade (código 23505) do Postgres. */
export function friendlyDbError(err: unknown, fallback: string, duplicateMessage: string): string {
  const code = (err as { code?: string } | null)?.code
  if (code === '23505') return duplicateMessage
  return err instanceof Error ? err.message : fallback
}

const AUTH_ERROR_MAP: Array<[string, string]> = [
  ['Invalid login credentials', 'E-mail ou senha incorretos.'],
  ['Email not confirmed', 'Confirme seu e-mail antes de entrar — verifique sua caixa de entrada.'],
  ['User already registered', 'Já existe uma conta com esse e-mail. Tente entrar em vez de criar uma nova conta.'],
  ['Password should be at least', 'A senha é muito curta — use pelo menos 8 caracteres, com letras e números.'],
]

/** Traduz as mensagens mais comuns do Supabase Auth para pt-BR; mantém a original como fallback. */
export function friendlyAuthError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : ''
  const match = AUTH_ERROR_MAP.find(([needle]) => message.includes(needle))
  return match?.[1] ?? message ?? fallback
}

export const MAX_COMMENT_LENGTH = 5000

const BLOCKED_ATTACHMENT_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'msi', 'msp', 'scr', 'ps1', 'vbs', 'vbe',
  'js', 'jse', 'wsf', 'wsh', 'jar', 'sh', 'bin', 'app', 'apk',
]

export function isBlockedAttachment(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return BLOCKED_ATTACHMENT_EXTENSIONS.includes(ext)
}
