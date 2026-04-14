import MobileNav from './MobileNav'
import Navbar from './Navbar'

interface PageWrapperProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export default function PageWrapper({ children, title, className = "" }: PageWrapperProps) {
  return (
    <div className={`min-h-screen bg-sand-50 flex flex-col ${className}`}>
      <Navbar />
      <div className="flex-1 w-full pb-20 md:pb-8">
        <div className="max-w-lg mx-auto px-4 md:max-w-4xl w-full">
          {title && (
            <h1 className="text-3xl font-bold text-gray-900 my-6">{title}</h1>
          )}
          {children}
        </div>
      </div>
      <MobileNav />
    </div>
  )
}
