import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>tudo bem</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('tudo bem')).toBeInTheDocument()
  })

  it('renders a fallback screen instead of crashing when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /recarregar página/i })).toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
