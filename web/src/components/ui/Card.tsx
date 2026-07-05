import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-slate-200 bg-white ${className}`} {...props} />
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border-b border-slate-200 bg-slate-50/60 px-4 py-3 ${className}`}>
      {typeof children === 'string' ? <h2 className="text-sm font-semibold text-slate-700">{children}</h2> : children}
    </div>
  )
}
