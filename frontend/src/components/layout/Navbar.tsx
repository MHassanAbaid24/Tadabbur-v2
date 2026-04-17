import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="font-sans font-bold text-2xl text-gray-900">Tadabbur</span>
          <span
            className="font-scheherazade text-xl text-gold-600"
            lang="ar"
            dir="rtl"
          >
            تدبّر
          </span>
        </div>

        <div className="flex items-center gap-8">
          <Link
            to="/home"
            className="text-gray-700 hover:text-gold-600 transition-colors font-medium"
          >
            Home
          </Link>
          <Link
            to="/journal"
            className="text-gray-700 hover:text-gold-600 transition-colors font-medium"
          >
            Journal
          </Link>
          <Link
            to="/circle"
            className="text-gray-700 hover:text-gold-600 transition-colors font-medium"
          >
            Circle
          </Link>
          <Link
            to="/progress"
            className="text-gray-700 hover:text-gold-600 transition-colors font-medium"
          >
            Progress
          </Link>
          <Link
            to="/profile"
            className="text-gray-700 hover:text-gold-600 transition-colors font-medium"
          >
            Profile
          </Link>
        </div>
      </div>
    </nav>
  )
}
