interface CardProps {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gold-500/20 p-4 md:p-6 ${className}`}
    >
      {children}
    </div>
  )
}
