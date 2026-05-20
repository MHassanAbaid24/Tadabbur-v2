import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScrollText } from 'lucide-react'

const LAST_UPDATED = 'May 20, 2026'

const sections = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    arabic: 'قبول الشروط',
    content: [
      'By accessing or using Tadabbur ("the Application", "the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Application.',
      'Tadabbur is developed with the intention of facilitating a closer connection to the Quran, rooted in the Islamic principle of amanah (trustworthiness). We ask that all users engage with this platform in the spirit of sincerity, respect, and goodness — ihsaan.',
    ],
  },
  {
    id: 'eligibility',
    title: 'Eligibility',
    arabic: 'الأهلية',
    content: [
      'You must be at least 13 years of age to use Tadabbur. By creating an account, you represent that you meet this requirement.',
      'Tadabbur is intended for individuals who seek a sincere, reflective engagement with the Quran. Use of the platform for any purpose contrary to its spiritual mission is discouraged and may result in account suspension.',
    ],
  },
  {
    id: 'account',
    title: 'Your Account',
    arabic: 'حسابك',
    content: [
      'You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account.',
      'You may optionally connect your Quran.com (Quran Foundation) account during onboarding. This connection enables synchronization of your streaks, activity days, notes, and reading sessions with the Quran Foundation platform. You may disconnect this integration at any time.',
      'You are responsible for all activity that occurs under your account. Sharing your account credentials with others is not permitted.',
    ],
  },
  {
    id: 'content',
    title: 'User Content & Reflections',
    arabic: 'المحتوى والتأملات',
    content: [
      'Your reflections, journal entries, and personal notes are your own. You retain full ownership of all content you create within Tadabbur.',
      'By default, your reflections are private. When you choose to share a reflection with your Circle, you grant other members of that Circle a limited right to view that content.',
      'You agree not to submit content that is disrespectful to Islam, the Quran, the Prophet ﷺ, or other members of the community. Content that is harmful, abusive, or contrary to Islamic ethical principles may be removed without notice.',
      'Quranic text, translations, tafsir content, and audio recitations are provided by the Quran Foundation via their official APIs and remain the property of their respective sources. We do not claim ownership over any Quranic content.',
    ],
  },
  {
    id: 'ai',
    title: 'AI-Generated Suggestions',
    arabic: 'الاقتراحات المولّدة بالذكاء الاصطناعي',
    content: [
      'Tadabbur includes an optional AI feature that generates a short, practical action suggestion after you complete a daily reflection. To generate this suggestion, your two reflection answers and the verse translation are sent to Google Gemini API.',
      'AI-generated suggestions are supplementary in nature and are not intended to replace Islamic scholarship, tafsir, or scholarly guidance. They should be evaluated critically and in light of Islamic knowledge.',
      'If the AI generation service is unavailable, no suggestion will be shown. Your reflection is always saved regardless of AI availability.',
      'We do not use your reflection content to train AI models. Data sent to Google Gemini API is governed by Google\'s privacy and data usage policies.',
    ],
  },
  {
    id: 'prohibited',
    title: 'Prohibited Uses',
    arabic: 'الاستخدامات المحظورة',
    content: [
      'You agree not to use Tadabbur for any purpose that is unlawful, harmful, or contrary to Islamic ethics.',
      'Specifically prohibited activities include: attempting to reverse-engineer or scrape the platform, using automated bots to create accounts or submit content, sharing content that misrepresents Quranic meaning or promotes heresy, and any activity that could damage, disable, or impair the Service.',
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    arabic: 'إنهاء الخدمة',
    content: [
      'You may delete your account at any time. Upon deletion, your personal profile, reflections, and circle memberships stored on our servers will be removed.',
      'We reserve the right to suspend or terminate accounts that violate these Terms, without prior notice.',
    ],
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer of Warranties',
    arabic: 'إخلاء المسؤولية',
    content: [
      'Tadabbur is provided "as is" and "as available" without warranty of any kind, express or implied. We do not guarantee uninterrupted, error-free, or completely secure access to the Service.',
      'Tadabbur is a hackathon project developed for the Quran Foundation Hackathon 2026. While we strive for reliability, we make no representations regarding uptime, data permanence, or feature continuity.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    arabic: 'التغييرات على هذه الشروط',
    content: [
      'We may update these Terms of Service from time to time. Continued use of the Application after changes are posted constitutes your acceptance of the updated terms.',
      'We will make a sincere effort to notify users of material changes where possible.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    arabic: 'التواصل',
    content: [
      'If you have any questions about these Terms, please reach out through the Tadabbur GitHub repository or through the Quran Foundation Hackathon 2026 submission channels.',
    ],
  },
]

export default function TermsOfService() {
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = 'Terms of Service — Tadabbur'
  }, [])

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: i * 0.05, ease: 'easeOut' },
    }),
  }

  return (
    <div className="min-h-screen bg-cream text-ink selection:bg-gold/20 relative overflow-hidden">
      {/* ─── STICKY HEADER ─── */}
      <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-cinzel font-medium text-xl tracking-[0.06em] text-green">Tadabbur</span>
            <span className="font-scheherazade text-xl text-gold leading-none" lang="ar" dir="rtl">تدبّر</span>
          </Link>
          <Link
            to="/auth"
            className="font-cinzel text-xs tracking-[0.08em] uppercase text-white bg-green hover:bg-green-mid px-5 py-2.5 rounded-sm transition-all shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-light mb-2">
            <ScrollText className="w-7 h-7 text-green" />
          </div>

          <div>
            <p className="font-cinzel text-xs text-gold tracking-[0.2em] uppercase mb-3">Legal</p>
            <h1 className="font-cinzel text-4xl sm:text-5xl text-green font-medium tracking-tight mb-4">
              Terms of Service
            </h1>
            <div className="h-[1px] w-20 bg-gold mx-auto mb-4" />
            <p
              className="font-scheherazade text-2xl text-gold"
              lang="ar"
              dir="rtl"
              translate="no"
            >
              وَأَوْفُوا۟ بِالْعَهْدِ ۖ إِنَّ الْعَهْدَ كَانَ مَسْـُٔولًا
            </p>
            <p className="font-cormorant text-base text-muted italic mt-2">
              "And fulfil every covenant. Verily, the covenant will be questioned about." — Al-Isra 17:34
            </p>
          </div>

          <p className="font-cormorant text-lg text-ink-soft max-w-xl mx-auto leading-relaxed">
            These terms govern your use of Tadabbur. We have written them plainly, in the spirit of 
            <span className="text-gold italic"> amanah</span> — trustworthiness.
          </p>

          <p className="font-cinzel text-xs text-muted tracking-wider uppercase">
            Last Updated: {LAST_UPDATED}
          </p>
        </motion.div>
      </section>

      {/* ─── TABLE OF CONTENTS ─── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-parchment/60 border border-border rounded-sm p-6"
        >
          <h2 className="font-cinzel text-sm text-green tracking-[0.12em] uppercase mb-4">Table of Contents</h2>
          <ol className="space-y-2">
            {sections.map((section, i) => (
              <li key={section.id} className="flex items-start gap-3">
                <span className="font-cinzel text-xs text-gold mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}.</span>
                <a
                  href={`#${section.id}`}
                  className="font-cormorant text-base text-ink-soft hover:text-green transition-colors"
                >
                  {section.title}
                  <span className="font-scheherazade text-muted ml-2 text-sm" lang="ar" dir="rtl" translate="no">
                    {section.arabic}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </motion.div>
      </section>

      {/* ─── SECTIONS ─── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-12">
        {sections.map((section, i) => (
          <motion.section
            key={section.id}
            id={section.id}
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className="scroll-mt-20"
          >
            <div className="flex items-start gap-4 mb-4">
              <span className="font-cinzel text-xs text-gold tracking-wider mt-1 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="font-cinzel text-xl text-green font-medium tracking-wide">{section.title}</h2>
                <p
                  className="font-scheherazade text-base text-muted mt-0.5"
                  lang="ar"
                  dir="rtl"
                  translate="no"
                >
                  {section.arabic}
                </p>
              </div>
            </div>
            <div className="border-l-2 border-gold/30 pl-8 space-y-3">
              {section.content.map((para, j) => (
                <p key={j} className="font-cormorant text-lg text-ink-soft leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </motion.section>
        ))}

        {/* ─── CLOSING BISMILLAH ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center pt-8 border-t border-border space-y-3"
        >
          <p
            className="font-scheherazade text-3xl text-gold"
            lang="ar"
            dir="rtl"
            translate="no"
          >
            بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
          </p>
          <p className="font-cormorant text-base text-muted italic">
            "In the Name of Allah, the Most Gracious, the Most Merciful."
          </p>
          <p className="font-cormorant text-base text-ink-soft max-w-lg mx-auto leading-relaxed">
            We built Tadabbur with sincerity, seeking to help Muslims strengthen their relationship with the Quran. May Allah accept this effort and make it a source of benefit.
          </p>
        </motion.div>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="bg-ink text-muted py-10 border-t border-border/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-baseline gap-2">
            <span className="font-cinzel font-medium text-lg tracking-[0.06em] text-white">Tadabbur</span>
            <span className="font-scheherazade text-lg text-gold leading-none" lang="ar" dir="rtl">تدبّر</span>
          </div>
          <div className="flex items-center gap-6 font-cinzel text-xs tracking-[0.08em] uppercase">
            <Link to="/terms" className="text-gold">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
          </div>
          <p className="font-cormorant text-sm text-center sm:text-right">
            © 2026 Tadabbur. Quran Foundation Hackathon 2026.
          </p>
        </div>
      </footer>
    </div>
  )
}
