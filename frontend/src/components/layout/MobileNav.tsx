import { useLocation } from 'react-router-dom'
import { Home, BookOpen, Users, BarChart3, User as UserIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function MobileNav() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname.startsWith(path)

  const tabs = [
    { path: '/home', label: 'Home', icon: Home },
    { path: '/journal', label: 'Journal', icon: BookOpen },
    { path: '/circle', label: 'Circle', icon: Users },
    { path: '/progress', label: 'Progress', icon: BarChart3 },
    { path: '/profile', label: 'Profile', icon: UserIcon },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="max-w-lg mx-auto px-4 flex items-center justify-around h-16">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = isActive(path)
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center min-h-14 min-w-14 gap-0.5 transition-colors ${
                active ? 'text-gold-500' : 'text-gray-400 hover:text-gray-600'
              }`}
              title={label}
            >
              <Icon size={24} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
