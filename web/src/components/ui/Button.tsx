import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'sm' | 'xs'

const base =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'

const sizeStyles: Record<Size, string> = {
  md: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
  xs: 'px-2 py-1 text-xs',
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-orange-600 text-white shadow-sm hover:bg-orange-700 focus-visible:ring-orange-300',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-slate-300',
  ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-300',
  danger: 'text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-300',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return <button className={`${base} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`} {...props} />
}
