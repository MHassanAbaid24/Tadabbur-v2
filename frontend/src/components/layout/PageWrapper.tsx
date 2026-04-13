import MobileNav from './MobileNav'

interface PageWrapperProps {
  children: React.ReactNode
  title?: string
}

export default function PageWrapper({ children, title }: PageWrapperProps) {
  return (
    <div>
      <div className="max-w-lg mx-auto px-4">
        {title && (
          <h1 className="text-3xl font-bold text-gray-900 my-6">{title}</h1>
        )}
        {children}
      </div>
      <MobileNav />
    </div>
  )
}
