import { forwardRef } from 'react'

type Variant = 'primary' | 'ghost' | 'outline'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  asChild?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium font-display tracking-tight rounded-xl transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-40 disabled:pointer-events-none select-none active:scale-[0.97] active:-translate-y-px cursor-pointer'

const variants: Record<Variant, string> = {
  primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-h)] shadow-[0_1px_3px_rgba(0,0,0,0.12)] hover:shadow-[0_2px_8px_color-mix(in_srgb,var(--accent)_35%,transparent)]',
  ghost:   'bg-transparent text-[var(--text-col)] hover:bg-[var(--border-col)] hover:text-[var(--text-col)]',
  outline: 'border border-[var(--border-col)] bg-[var(--surface)] text-[var(--text-col)] hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
}

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 h-7',
  md: 'text-sm px-4 py-2 h-9',
  lg: 'text-base px-6 py-3 h-11',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = 'Button'
