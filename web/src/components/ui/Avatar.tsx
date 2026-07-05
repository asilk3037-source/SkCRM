const SIZE_CLASSES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
}

const PALETTE = ['bg-orange-600', 'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-rose-600', 'bg-cyan-600']

function colorFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

/** Initials avatar with a stable color per name/email — used anywhere a person is shown. */
export function Avatar({ name, size = 'md', className = '' }: { name: string; size?: keyof typeof SIZE_CLASSES; className?: string }) {
  const initial = (name || '?').trim().slice(0, 1).toUpperCase()
  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white ${colorFor(name)} ${SIZE_CLASSES[size]} ${className}`}
    >
      {initial}
    </span>
  )
}
