interface BadgeProps {
  children: React.ReactNode
  variant?: 'gold' | 'emerald' | 'gray'
  className?: string
}

export default function Badge({
  children,
  variant = 'gold',
  className = '',
}: BadgeProps) {
  const variants = {
    gold: 'bg-gold-100 text-gold-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    gray: 'bg-gray-100 text-gray-700',
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
