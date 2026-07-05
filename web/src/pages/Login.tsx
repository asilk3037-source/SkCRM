import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Field'
import { Alert } from '../components/ui/Alert'
import { AuthShell } from '../components/AuthShell'
import { friendlyAuthError } from '../lib/validators'

export function Login() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(friendlyAuthError(err, 'Não foi possível entrar.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Bem-vindo de volta" subtitle="Entre com sua conta para acessar o SkCRM.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="!mb-0">
              Senha
            </Label>
            <Link to="/recuperar-senha" className="mb-1.5 text-xs font-medium text-orange-600 hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">
        Não tem conta?{' '}
        <Link to="/cadastro" className="font-medium text-orange-600 hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  )
}
