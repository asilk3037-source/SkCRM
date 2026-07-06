import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/Button'
import { IconAlertTriangle } from './ui/icons'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Last-resort catch for render errors. Without this, any uncaught error
 * anywhere in the tree unmounts the whole app to a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro não tratado na interface:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <IconAlertTriangle className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-lg font-semibold text-slate-900">Algo deu errado</h1>
            <p className="mt-2 text-sm text-slate-500">
              Essa tela encontrou um erro inesperado. Recarregar a página costuma resolver — se continuar
              acontecendo, avise o suporte.
            </p>
            <Button className="mt-6 w-full justify-center" onClick={() => window.location.reload()}>
              Recarregar página
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
