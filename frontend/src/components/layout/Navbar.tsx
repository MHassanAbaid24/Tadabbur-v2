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
          <a
            href="/home"
            className="text-gray-700 hover:text-gold-600 transition-colors font-medium"
          >
            Home
          </a>
          <a
            href="/journal"
            className="text-gray-700 hover:text-gold-600 transition-colors font-medium"
          >
            Journal
          </a>
          <a
            href="/circle"
            className="text-gray-700 hover:text-gold-600 transition-colors font-medium"
          >
            Circle
          </a>
          <a
            href="/progress"
            className="text-gray-700 hover:text-gold-600 transition-colors font-medium"
          >
            Progress
          </a>
        </div>
      </div>
    </nav>
  )
}
