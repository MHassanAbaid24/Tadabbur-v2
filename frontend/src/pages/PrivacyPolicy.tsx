import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'

const LAST_UPDATED = 'May 20, 2026'

const sections = [
  {
    id: 'overview',
    title: 'Our Commitment to Your Privacy',
    arabic: 'التزامنا بخصوصيتك',
    content: [
      'Tadabbur is built on the Islamic principle of amanah — trustworthiness. Your personal reflections, spiritual journey, and private data are treated as a sacred trust. We do not sell your data. We do not run ads. We collect only what is necessary to provide the Service.',
      'This Privacy Policy explains what data we collect, why we collect it, how it is stored, and with whom it may be shared.',
    ],
  },
  {
    id: 'data-collected',
    title: 'Data We Collect',
    arabic: 'البيانات التي نجمعها',
    content: [
      'Account Information: When you register, we collect your email address, a bcrypt-hashed password (plaintext password is never stored), your chosen display name, and a derived username handle (generated from your email prefix).',
      'Reflection Content: Your answers to the two daily reflection prompts ("What does this ayah mean to you?" and "What will you do differently today?"), your selected spiritual mood, the date of the reflection, and whether you chose to share it with your Circle.',
      'Progress Data: XP points earned, your current level, and your daily reflection activity log.',
      'Circle Data: The name of circles you create or join, and your membership records.',
      'Preferences: Your optional daily reminder time and timezone setting.',
      'Quran Foundation Token: If you connect your Quran.com account during onboarding, we store your QF OAuth2 access token, encrypted at rest, to sync your streaks, activity days, notes, and reading sessions with the Quran Foundation platform.',
    ],
  },
  {
    id: 'data-use',
    title: 'How We Use Your Data',
    arabic: 'كيف نستخدم بياناتك',
    content: [
      'To provide and personalize the core Tadabbur experience: displaying your daily verse, saving your reflections, maintaining your streak, and showing your circle\'s shared reflections.',
      'To synchronize your Quran.com data: activity days, notes tagged with "tadabbur", reading sessions, rooms, and posts are synced with the Quran Foundation User APIs on your behalf using your stored QF token.',
      'To generate AI action suggestions: when you complete a daily reflection, your two reflection answers and the verse translation are sent to the Google Gemini API to generate a short, practical suggestion. This data is transmitted over HTTPS and is governed by Google\'s data usage policies. We do not use your reflections to train any AI model.',
      'To send OTP verification emails: your email address is used once during registration to send a 6-digit verification code via Brevo (or Gmail SMTP as a fallback). We do not send marketing emails.',
    ],
  },
  {
    id: 'data-storage',
    title: 'Data Storage & Security',
    arabic: 'تخزين البيانات والأمان',
    content: [
      'Your data is stored in a Supabase-managed PostgreSQL database hosted within Supabase\'s secure cloud infrastructure. Supabase enforces Row-Level Security (RLS) policies that ensure each user can only access their own data.',
      'Your QF OAuth2 access token is encrypted using an authenticated CTR-mode cipher before being stored in the database. It is decrypted in memory only when needed to make API calls on your behalf.',
      'Passwords are hashed using bcrypt and are never stored in plaintext. They are never logged under any circumstances.',
      'All communications between your browser, our backend, and third-party services use HTTPS/TLS encryption.',
    ],
  },
  {
    id: 'data-sharing',
    title: 'Data Sharing',
    arabic: 'مشاركة البيانات',
    content: [
      'We do not sell, rent, or trade your personal data to any third party.',
      'Quran Foundation: If you connect your Quran.com account, your reflection content (when shared with a circle) and activity data are synchronized with the Quran Foundation\'s platform. This is a feature you explicitly opt into during onboarding and can disconnect at any time.',
      'Google Gemini API: Your reflection answers and verse translation text are sent to Google Gemini API for AI suggestion generation only. See Google\'s Privacy Policy for how they handle API data.',
      'Supabase: Our database and authentication infrastructure provider. See Supabase\'s Privacy Policy for their data handling practices.',
      'No other third parties receive your personal data.',
    ],
  },
  {
    id: 'circles',
    title: 'Circles & Shared Reflections',
    arabic: 'الدوائر والتأملات المشتركة',
    content: [
      'Your reflections are private by default. Only when you explicitly toggle "Share with Circle" before submitting will your reflection be visible to other members of your circle.',
      'Circle members can see your display name, the date, your reflection text, and your mood when you share. They cannot see your email address, password, or any account credentials.',
      'Circle membership lists (who has joined which circle) are visible to other members of that same circle.',
    ],
  },
  {
    id: 'retention',
    title: 'Data Retention & Deletion',
    arabic: 'الاحتفاظ بالبيانات وحذفها',
    content: [
      'Your data is retained for as long as your account is active.',
      'You may request deletion of your account at any time. Upon deletion, your profile, reflections, circle memberships, and XP records stored on our servers will be permanently removed.',
      'Notes and posts synchronized to the Quran Foundation platform must be deleted separately through your Quran.com account settings, as they are stored on QF infrastructure.',
    ],
  },
  {
    id: 'rights',
    title: 'Your Rights',
    arabic: 'حقوقك',
    content: [
      'You have the right to access the personal data we hold about you, to correct inaccuracies, and to request deletion of your account and its associated data.',
      'You may disconnect your Quran.com integration at any time from your profile settings, which will remove your stored QF token from our servers.',
      'You may choose to keep all reflections private by never enabling the "Share with Circle" toggle. Solo mode is fully supported.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies & Local Storage',
    arabic: 'ملفات تعريف الارتباط والتخزين المحلي',
    content: [
      'Tadabbur stores your authentication token in your browser\'s localStorage to keep you logged in across sessions. No third-party tracking cookies are used.',
      'We do not use any advertising networks, analytics pixel tracking, or behavioural profiling technologies.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    arabic: 'التغييرات على هذه السياسة',
    content: [
      'We may update this Privacy Policy as the Service evolves. We will make a sincere effort to notify users of material changes. Continued use of the Application after changes are posted constitutes acceptance of the updated policy.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    arabic: 'التواصل',
    content: [
      'If you have questions or concerns about your privacy or this policy, please reach out via the Tadabbur GitHub repository or through the Quran Foundation Hackathon 2026 submission channels.',
    ],
  },
]

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = 'Privacy Policy — Tadabbur'
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
            <ShieldCheck className="w-7 h-7 text-green" />
          </div>

          <div>
            <p className="font-cinzel text-xs text-gold tracking-[0.2em] uppercase mb-3">Legal</p>
            <h1 className="font-cinzel text-4xl sm:text-5xl text-green font-medium tracking-tight mb-4">
              Privacy Policy
            </h1>
            <div className="h-[1px] w-20 bg-gold mx-auto mb-4" />
            <p
              className="font-scheherazade text-2xl text-gold"
              lang="ar"
              dir="rtl"
              translate="no"
            >
              إِنَّ اللَّهَ كَانَ عَلَيْكُمْ رَقِيبًا
            </p>
            <p className="font-cormorant text-base text-muted italic mt-2">
              "Indeed, Allah is ever, over you, an Observer." — An-Nisa 4:1
            </p>
          </div>

          <p className="font-cormorant text-lg text-ink-soft max-w-xl mx-auto leading-relaxed">
            We handle your data as a trust. Your reflections are personal and spiritual — we treat them accordingly.
          </p>

          <p className="font-cinzel text-xs text-muted tracking-wider uppercase">
            Last Updated: {LAST_UPDATED}
          </p>
        </motion.div>
      </section>

      {/* ─── QUICK SUMMARY CARDS ─── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid sm:grid-cols-3 gap-4"
        >
          {[
            { icon: '🚫', title: 'No Ads. Ever.', desc: 'We do not run any advertising or track you for ad targeting.' },
            { icon: '🤝', title: 'No Data Sales', desc: 'Your personal data is never sold, rented, or traded to third parties.' },
            { icon: '🔒', title: 'Encrypted & Private', desc: 'Tokens encrypted at rest. Passwords never stored in plaintext. RLS enforced.' },
          ].map((card) => (
            <div key={card.title} className="bg-white border border-border rounded-sm p-5 flex flex-col gap-2">
              <span className="text-2xl">{card.icon}</span>
              <h3 className="font-cinzel text-sm text-green tracking-wide">{card.title}</h3>
              <p className="font-cormorant text-base text-ink-soft leading-snug">{card.desc}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ─── TABLE OF CONTENTS ─── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
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

        {/* ─── CLOSING DUA ─── */}
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
            رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً
          </p>
          <p className="font-cormorant text-base text-muted italic">
            "Our Lord, give us good in this world and good in the Hereafter." — Al-Baqarah 2:201
          </p>
          <p className="font-cormorant text-base text-ink-soft max-w-lg mx-auto leading-relaxed">
            We are committed to handling your trust responsibly. This platform exists to draw people closer to the Quran — nothing more, nothing less.
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
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="text-gold">Privacy</Link>
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
