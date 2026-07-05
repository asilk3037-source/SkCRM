import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { IconChevronDown } from './icons'

const controlBase =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'

const controlTone = (invalid?: boolean) =>
  invalid
    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
    : 'border-slate-300 focus:border-orange-500 focus:ring-orange-100'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ invalid, className = '', ...props }: InputProps) {
  return <input className={`${controlBase} ${controlTone(invalid)} ${className}`} {...props} />
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ invalid, className = '', ...props }: TextareaProps) {
  return <textarea className={`${controlBase} resize-y ${controlTone(invalid)} ${className}`} {...props} />
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ invalid, className = '', children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={`${controlBase} ${controlTone(invalid)} appearance-none pr-9 ${className}`}
        {...props}
      >
        {children}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

export function Label({ className = '', ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`mb-1.5 block text-sm font-medium text-slate-700 ${className}`} {...props} />
}

export function FieldGroup({
  label,
  hint,
  className = '',
  children,
}: {
  label?: ReactNode
  hint?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
