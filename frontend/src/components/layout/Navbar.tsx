import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const isActive = (path: string) => location.pathname.startsWith(path)

  const navLinks = [
    { path: '/home', label: 'Home' },
    { path: '/journal', label: 'Journal' },
    { path: '/explore', label: 'Explore' },
    { path: '/circle', label: 'Circle' },
    { path: '/progress', label: 'Progress' },
    { path: '/profile', label: 'Profile' },
  ]

  return (
    <nav className="hidden md:block sticky top-0 z-50 bg-cream/92 backdrop-blur-md border-b border-border">
      <div className="max-w-[1100px] mx-auto px-8 h-16 flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <span className="font-cinzel font-medium text-[1.35rem] tracking-[0.06em] text-green">Tadabbur</span>
          <span
            className="font-scheherazade text-[1.4rem] text-gold leading-none"
            lang="ar"
            dir="rtl"
          >
            تدبّر
          </span>
        </div>

        <ul className="flex items-center gap-8 list-none m-0 p-0">
          {navLinks.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={`font-cinzel text-[0.72rem] tracking-[0.1em] uppercase transition-colors relative group block ${
                  isActive(link.path) ? 'text-green' : 'text-ink-soft hover:text-gold'
                }`}
              >
                {link.label}
                <span className={`absolute -bottom-[3px] left-0 right-0 h-[1px] transition-transform duration-[250ms] ${
                  isActive(link.path) ? 'bg-green scale-x-100' : 'bg-gold scale-x-0 group-hover:scale-x-100'
                }`} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
