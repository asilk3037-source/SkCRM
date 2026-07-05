import { Alert } from './Alert'
import { Button } from './Button'

/** Shown instead of an empty state when a list genuinely failed to load (vs. being empty). */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert tone="error">
      <div className="flex flex-wrap items-center gap-3">
        <span>Não foi possível carregar os dados: {message}</span>
        <Button size="xs" variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    </Alert>
  )
}
