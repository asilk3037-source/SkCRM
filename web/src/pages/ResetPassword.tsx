import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isStrongPassword } from '../lib/validators'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Field'
import { Alert } from '../components/ui/Alert'
import { AuthShell } from '../components/AuthShell'
import { PageLoading } from '../components/ui/Spinner'

export function ResetPassword() {
  const { session, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isStrongPassword(password)) {
      setError('A senha precisa ter pelo menos 8 caracteres, com letras e números.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setSubmitting(true)
    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AuthShell title="Redefinir senha" subtitle="Confirmando seu link de recuperação...">
        <PageLoading />
      </AuthShell>
    )
  }

  if (!session) {
    return (
      <AuthShell title="Link inválido ou expirado" subtitle="Solicite um novo link de recuperação.">
        <Alert tone="error">Este link de redefinição de senha não é mais válido.</Alert>
        <p className="mt-5 text-center text-sm text-slate-500">
          <Link to="/recuperar-senha" className="font-medium text-orange-600 hover:underline">
            Solicitar novo link
          </Link>
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Redefinir senha" subtitle="Escolha uma nova senha para sua conta.">
      {done ? (
        <Alert tone="success">Senha redefinida com sucesso! Redirecionando...</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div>
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-slate-400">Mínimo 8 caracteres, com letras e números.</p>
          </div>
          <div>
            <Label htmlFor="confirm">Confirmar nova senha</Label>
            <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Salvando...' : 'Redefinir senha'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
