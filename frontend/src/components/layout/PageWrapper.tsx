import MobileNav from './MobileNav'
import Navbar from './Navbar'

interface PageWrapperProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export default function PageWrapper({ children, title, className = "" }: PageWrapperProps) {
  return (
    <>
      <Navbar />
      <div className={`relative z-10 max-w-[740px] mx-auto px-5 pb-24 pt-8 md:px-8 md:pb-12 md:pt-12 ${className}`}>
        
        {/* Mobile brand */}
        <div className="md:hidden flex items-center justify-center gap-[10px] pt-5 mb-[-0.5rem]">
          <span className="font-cinzel text-[1.1rem] tracking-[0.07em] text-green">Tadabbur</span>
          <span className="font-scheherazade text-[1.3rem] text-gold" lang="ar" dir="rtl">تدبّر</span>
        </div>

        {/* Page header */}
        {title && (
          <div className="flex items-center justify-between mb-10 pb-4 border-b border-border sticky top-0 md:top-[64px] bg-cream z-10 pt-2">
            <h1 className="font-cinzel text-[1.05rem] font-medium tracking-[0.08em] uppercase text-green">{title}</h1>
          </div>
        )}
        
        {children}
      </div>
      <MobileNav />
    </>
  )
}
