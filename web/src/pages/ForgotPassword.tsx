import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Field'
import { Alert } from '../components/ui/Alert'
import { AuthShell } from '../components/AuthShell'

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await requestPasswordReset(email.trim())
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o e-mail de recuperação.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Recuperar senha" subtitle="Enviamos um link para você criar uma nova senha.">
      {done ? (
        <Alert tone="success">
          Se houver uma conta com o e-mail <strong>{email}</strong>, enviamos um link de redefinição de senha.
          Verifique sua caixa de entrada (e o spam).
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-slate-500">
        Lembrou a senha?{' '}
        <Link to="/login" className="font-medium text-orange-600 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </AuthShell>
  )
}
