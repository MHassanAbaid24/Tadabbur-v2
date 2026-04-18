import { Link } from 'react-router-dom'
import MobileNav from './MobileNav'
import Navbar from './Navbar'

interface PageWrapperProps {
  children: React.ReactNode
  title?: string
  className?: string
  headerRight?: React.ReactNode
}

export default function PageWrapper({ 
  children, 
  title, 
  className = "",
  headerRight
}: PageWrapperProps) {
  return (
    <>
      <Navbar />
      
      {/* Mobile Sticky Header */}
      <div className="md:hidden sticky top-0 z-50 bg-cream/96 backdrop-blur-md border-b border-border h-14 flex items-center justify-between px-5">
        <Link to="/home" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <span className="font-cinzel font-medium text-[0.95rem] tracking-[0.08em] text-green">Tadabbur</span>
          <span className="font-scheherazade text-[1.1rem] text-gold leading-none" lang="ar" dir="rtl">تدبّر</span>
        </Link>
        
        {headerRight && (
          <div className="flex items-center">
            {headerRight}
          </div>
        )}
      </div>

      <div className={`relative z-10 max-w-[740px] mx-auto px-5 pb-24 pt-6 md:px-8 md:pb-12 md:pt-12 ${className}`}>
        
        {/* Page title (secondary on mobile) */}
        {title && (
          <div className="mb-8 pb-3 border-b border-border/60">
            <h1 className="font-cinzel text-[0.9rem] font-medium tracking-[0.08em] uppercase text-ink-soft">{title}</h1>
          </div>
        )}
        
        {children}
      </div>
      <MobileNav />
    </>
  )
}
