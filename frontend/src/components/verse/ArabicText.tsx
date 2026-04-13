interface ArabicTextProps {
  text: string
  className?: string
}

export default function ArabicText({ text, className = '' }: ArabicTextProps) {
  return (
    <p
      translate="no"
      className={`notranslate font-scheherazade text-3xl text-right leading-loose ${className}`}
      dir="rtl"
      lang="ar"
    >
      {text}
    </p>
  )
}
