interface InputProps {
  label?: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'password' | 'number' | 'time'
  placeholder?: string
  error?: string
  maxLength?: number
  className?: string
}

export default function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  maxLength,
  className = '',
}: InputProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full px-4 py-3 min-h-11 border-2 rounded-lg text-base transition-colors ${
            error
              ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200'
              : 'border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200'
          } focus:outline-none`}
        />
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {maxLength && (
        <p className="text-xs text-gray-500 mt-1 text-right">
          {value.length} / {maxLength}
        </p>
      )}
    </div>
  )
}
