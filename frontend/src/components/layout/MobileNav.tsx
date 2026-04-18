import { useLocation } from 'react-router-dom'
import { Home, BookOpen, Users, BarChart3, User as UserIcon, Book } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function MobileNav() {
  const location = useLocation()
  const isActive = (path: string) => location.pathname.startsWith(path)

  const tabs = [
    { path: '/home', label: 'Home', icon: Home },
    { path: '/journal', label: 'Journal', icon: BookOpen },
    { path: '/explore', label: 'Explore', icon: Book },
    { path: '/circle', label: 'Circle', icon: Users },
    { path: '/progress', label: 'Progress', icon: BarChart3 },
    { path: '/profile', label: 'Profile', icon: UserIcon },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-cream/96 backdrop-blur-md border-t border-border z-50 h-[60px]">
      <div className="max-w-[500px] mx-auto w-full flex items-center justify-around h-full">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = isActive(path)
          return (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors font-cinzel text-[0.52rem] tracking-[0.06em] uppercase ${
                active ? 'text-green' : 'text-muted hover:text-gold'
              }`}
              title={label}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
