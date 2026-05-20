import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Users, Award, Flame, Calendar, Shield, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  // State for the interactive simulator
  const [meaning, setMeaning] = useState('')
  const [commitment, setCommitment] = useState('')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showXPPopup, setShowXPPopup] = useState(false)

  const moods = [
    { title: 'Peace', emoji: '☮️' },
    { title: 'Gratitude', emoji: '🙏' },
    { title: 'Hope', emoji: '🌅' },
    { title: 'Strength', emoji: '💪' },
    { title: 'Moved', emoji: '🥹' },
  ]

  const handleMockReflect = (e: React.FormEvent) => {
    e.preventDefault()
    if (!meaning.trim() || !commitment.trim() || !selectedMood) return
    setIsSubmitted(true)
    setShowXPPopup(true)
    setTimeout(() => setShowXPPopup(false), 4000)
  }

  const handleStartCTA = () => {
    if (isAuthenticated) {
      navigate('/home')
    } else {
      navigate('/auth')
    }
  }

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  }

  return (
    <div className="min-h-screen bg-cream selection:bg-gold/20 text-ink relative overflow-hidden">
      {/* ─── STICKY HEADER ─── */}
      <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-border transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="font-cinzel font-medium text-xl sm:text-2xl tracking-[0.06em] text-green">Tadabbur</span>
            <span className="font-scheherazade text-xl sm:text-2xl text-gold leading-none" lang="ar" dir="rtl">تدبّر</span>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/home"
                className="font-cinzel text-xs sm:text-sm tracking-[0.08em] uppercase text-white bg-green hover:bg-green-mid px-5 py-2.5 rounded-sm transition-all shadow-sm hover:shadow-md"
              >
                Go to App
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="font-cinzel text-xs sm:text-sm tracking-[0.08em] uppercase text-ink-soft hover:text-gold transition-colors px-3 py-2"
                >
                  Log In
                </Link>
                <Link
                  to="/auth"
                  className="hidden sm:inline-block font-cinzel text-xs sm:text-sm tracking-[0.08em] uppercase text-white bg-green hover:bg-green-mid px-5 py-2.5 rounded-sm transition-all shadow-sm hover:shadow-md"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 lg:pt-20 lg:pb-32">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Hero Left Info */}
          <motion.div 
            className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left z-10"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <div className="flex items-center gap-2 px-3 py-1 bg-gold-faint border border-gold/20 rounded-full mb-6">
              <span className="text-gold text-xs font-semibold tracking-wider font-cinzel uppercase">Quran Foundation Hackathon 2026</span>
            </div>
            
            <h1 className="font-cinzel text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-green leading-[1.1] mb-6">
              Read. Reflect. <br className="hidden sm:block" />
              <span className="text-gold italic">Grow Together.</span>
            </h1>

            <p className="font-cormorant text-xl sm:text-2xl text-ink-soft leading-relaxed max-w-xl mb-8">
              A daily Quran reflection journal that brings you closer to the Word. Connect, share your spiritual takeaways in small circles of friends and family, and build a lasting habit loop.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={handleStartCTA}
                className="font-cinzel tracking-wider uppercase text-sm font-semibold text-white bg-green hover:bg-green-mid px-8 py-4 rounded-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
              >
                {isAuthenticated ? 'Go to App' : 'Start Your Reflection'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <a
                href="#how-it-works"
                className="font-cinzel tracking-wider uppercase text-sm font-semibold text-ink-soft hover:text-gold px-8 py-4 border border-border bg-white/50 hover:bg-white rounded-sm transition-all flex items-center justify-center gap-1"
              >
                Learn More
              </a>
            </div>

            <div className="flex items-center gap-6 mt-12 text-muted">
              <div className="flex flex-col">
                <span className="font-cinzel text-lg font-bold text-green">100%</span>
                <span className="text-[0.65rem] uppercase tracking-wider">Ad-Free</span>
              </div>
              <div className="h-8 w-[1px] bg-border" />
              <div className="flex flex-col">
                <span className="font-cinzel text-lg font-bold text-green">Synced</span>
                <span className="text-[0.65rem] uppercase tracking-wider">QF APIs v4</span>
              </div>
              <div className="h-8 w-[1px] bg-border" />
              <div className="flex flex-col">
                <span className="font-cinzel text-lg font-bold text-green">Intimate</span>
                <span className="text-[0.65rem] uppercase tracking-wider">Private Circles</span>
              </div>
            </div>
          </motion.div>

          {/* Hero Right Simulator */}
          <motion.div 
            className="lg:col-span-6 z-10"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            <div className="relative">
              {/* Decorative back-cards for depth */}
              <div className="absolute inset-0 bg-gold-faint border border-border rounded-md rotate-2 scale-[0.98] -z-10 translate-y-3" />
              <div className="absolute inset-0 bg-green-light/40 border border-border rounded-md -rotate-1 scale-[0.99] -z-10 translate-y-1.5" />

              {/* Main Card */}
              <div className="bg-white border border-border rounded-sm shadow-xl p-6 sm:p-8 relative overflow-hidden transition-all duration-300">
                {/* Gold Card Trim */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-green" />

                {/* Card Title */}
                <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                  <div className="flex items-center gap-1.5 text-gold text-xs font-semibold font-cinzel tracking-wider uppercase">
                    <span>❧ ✦ ❧</span>
                    <span>Daily Ayah Preview</span>
                    <span>❧ ✦ ❧</span>
                  </div>
                  <span className="font-cinzel text-xs text-muted">Al-Baqarah · 2:152</span>
                </div>

                <AnimatePresence mode="wait">
                  {!isSubmitted ? (
                    <motion.form 
                      key="simulator-form"
                      onSubmit={handleMockReflect}
                      className="space-y-5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="text-right mb-4">
                        <p 
                          className="font-scheherazade text-2xl sm:text-3xl text-ink leading-relaxed tracking-wide py-2" 
                          dir="rtl" 
                          lang="ar"
                          translate="no"
                        >
                          فَٱذْكُرُونِىٓ أَذْكُرْكُمْ وَٱشْكُرُوا۟ لِى وَلَا تَكْفُرُونِ
                        </p>
                        <p className="font-cormorant text-base sm:text-lg text-ink-soft text-left italic font-light mt-3 leading-relaxed">
                          "So remember Me; I will remember you. And be grateful to Me and do not deny Me."
                        </p>
                      </div>

                      <div className="space-y-4 pt-2 border-t border-border/60">
                        <div>
                          <label className="block font-cinzel text-[0.7rem] uppercase tracking-wider text-muted mb-1.5">
                            What does this ayah mean to you, right now, in your life?
                          </label>
                          <textarea
                            value={meaning}
                            onChange={(e) => setMeaning(e.target.value)}
                            placeholder="Your reflection…"
                            required
                            rows={2}
                            className="w-full font-cormorant text-base text-ink bg-cream/30 border border-border focus:border-green-mid focus:ring-0 rounded-sm p-3 resize-none outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block font-cinzel text-[0.7rem] uppercase tracking-wider text-muted mb-1.5">
                            What is one thing you will do differently today?
                          </label>
                          <textarea
                            value={commitment}
                            onChange={(e) => setCommitment(e.target.value)}
                            placeholder="Your commitment…"
                            required
                            rows={2}
                            className="w-full font-cormorant text-base text-ink bg-cream/30 border border-border focus:border-green-mid focus:ring-0 rounded-sm p-3 resize-none outline-none transition-all"
                          />
                        </div>

                        <div>
                          <span className="block font-cinzel text-[0.7rem] uppercase tracking-wider text-muted mb-2">
                            How are you feeling today?
                          </span>
                          <div className="flex gap-2 flex-wrap">
                            {moods.map((mood) => (
                              <button
                                key={mood.title}
                                type="button"
                                title={mood.title}
                                onClick={() => setSelectedMood(mood.title)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border transition-all ${
                                  selectedMood === mood.title
                                    ? 'bg-gold-faint border-gold scale-105 shadow-sm'
                                    : 'bg-parchment/40 border-border hover:bg-gold-faint hover:border-gold-light'
                                }`}
                              >
                                {mood.emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!meaning.trim() || !commitment.trim() || !selectedMood}
                        className="w-full font-cinzel tracking-wider uppercase text-xs font-semibold text-white bg-green hover:bg-green-mid disabled:bg-muted/40 disabled:cursor-not-allowed px-6 py-3.5 rounded-sm transition-all mt-4"
                      >
                        Reflect Now
                      </button>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="simulator-success"
                      className="text-center py-6 space-y-6"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto text-green shadow-inner">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-cinzel text-xl text-green tracking-wide">Pondered & Recorded</h3>
                        <p className="font-cormorant text-lg text-ink-soft max-w-sm mx-auto">
                          You have completed the daily reflection loop successfully. See how Tadabbur rewards your habit:
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                        <div className="bg-gold-faint border border-gold/20 rounded-md p-4 flex flex-col items-center justify-center">
                          <Flame className="w-6 h-6 text-gold mb-1" />
                          <span className="font-cinzel text-[0.62rem] uppercase tracking-wider text-muted">Streak Activated! 🔥</span>
                          <span className="font-cinzel text-lg font-bold text-ink">1 Day</span>
                        </div>
                        <div className="bg-green-light border border-green/10 rounded-md p-4 flex flex-col items-center justify-center">
                          <Award className="w-6 h-6 text-green mb-1" />
                          <span className="font-cinzel text-[0.62rem] uppercase tracking-wider text-muted">XP Reward</span>
                          <span className="font-cinzel text-lg font-bold text-ink">+10 XP Earned</span>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-border/60 space-y-4">
                        <p className="font-cormorant text-base text-muted italic">
                          Create an account to save your reflection & streaks.
                        </p>
                        <button
                          onClick={() => navigate('/auth')}
                          className="font-cinzel tracking-wider uppercase text-xs font-semibold text-white bg-gold hover:bg-gold-600 px-8 py-3.5 rounded-sm shadow-md hover:shadow-lg transition-all"
                        >
                          Lock In My Progress
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Floating XP Alert Popup */}
                <AnimatePresence>
                  {showXPPopup && (
                    <motion.div 
                      className="absolute bottom-6 right-6 bg-green text-white px-4 py-2 rounded-sm font-cinzel text-xs font-bold flex items-center gap-1.5 shadow-lg"
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <span>🔥 Streak Active! +10 XP</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ─── HOW IT WORKS SECTION ─── */}
      <section id="how-it-works" className="bg-parchment/30 border-y border-border py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-cinzel text-xs text-gold font-bold tracking-[0.2em] uppercase mb-3">Habit Loop</h2>
            <h3 className="font-cinzel text-3xl sm:text-4xl text-green font-medium mb-4">The Daily Rhythm</h3>
            <div className="h-[1px] w-20 bg-gold mx-auto mb-4" />
            <p className="font-cormorant text-lg sm:text-xl text-ink-soft">
              Maintaining daily Quran connection is made simple and rewarding through four intentional steps.
            </p>
          </div>

          <motion.div 
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {/* Step 1 */}
            <motion.div className="bg-white border border-border p-6 rounded-sm flex flex-col hover:shadow-lg transition-all duration-300" variants={fadeIn}>
              <div className="w-12 h-12 bg-green-light rounded-full flex items-center justify-center text-green mb-6 font-cinzel font-bold text-lg">
                1
              </div>
              <h4 className="font-cinzel text-lg text-green font-medium mb-3">Read & Listen</h4>
              <p className="font-cormorant text-base text-ink-soft flex-grow leading-relaxed">
                Open the app to receive today's deterministic verse, shared by all users on this day. Listen to Mishary Rashid's recitation and explore short tafsir.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div className="bg-white border border-border p-6 rounded-sm flex flex-col hover:shadow-lg transition-all duration-300" variants={fadeIn}>
              <div className="w-12 h-12 bg-gold-faint rounded-full flex items-center justify-center text-gold mb-6 font-cinzel font-bold text-lg">
                2
              </div>
              <h4 className="font-cinzel text-lg text-green font-medium mb-3">Reflect & Log</h4>
              <p className="font-cormorant text-base text-ink-soft flex-grow leading-relaxed">
                Answer two specific prompt questions exploring what this verse teaches you, select your spiritual mood, and log it to your private Quran Journal.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div className="bg-white border border-border p-6 rounded-sm flex flex-col hover:shadow-lg transition-all duration-300" variants={fadeIn}>
              <div className="w-12 h-12 bg-green-light rounded-full flex items-center justify-center text-green mb-6 font-cinzel font-bold text-lg">
                3
              </div>
              <h4 className="font-cinzel text-lg text-green font-medium mb-3">Share in Circles</h4>
              <p className="font-cormorant text-base text-ink-soft flex-grow leading-relaxed">
                Share your reflections inside a private room with close family or friends. Grow together without algorithmic distractions or public noise.
              </p>
            </motion.div>

            {/* Step 4 */}
            <motion.div className="bg-white border border-border p-6 rounded-sm flex flex-col hover:shadow-lg transition-all duration-300" variants={fadeIn}>
              <div className="w-12 h-12 bg-gold-faint rounded-full flex items-center justify-center text-gold mb-6 font-cinzel font-bold text-lg">
                4
              </div>
              <h4 className="font-cinzel text-lg text-green font-medium mb-3">Maintain Habits</h4>
              <p className="font-cormorant text-base text-ink-soft flex-grow leading-relaxed">
                Earn daily reflections points, build streaks, unlock 5 progressive levels, and visually track your growth through a Github-style activity heatmap.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES FOCUS GRID ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-cinzel text-xs text-gold font-bold tracking-[0.2em] uppercase mb-3">Designed for Depth</h2>
          <h3 className="font-cinzel text-3xl sm:text-4xl text-green font-medium mb-4">Spiritual Engagement Toolkit</h3>
          <div className="h-[1px] w-20 bg-gold mx-auto mb-4" />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white border border-border rounded-sm p-8 hover:shadow-md transition-all flex gap-4">
            <div className="text-gold mt-1"><BookOpen className="w-6 h-6" /></div>
            <div>
              <h4 className="font-cinzel text-lg text-green font-medium mb-2">Deep Content Integrations</h4>
              <p className="font-cormorant text-base text-ink-soft leading-relaxed">
                Utilizes official Quran Foundation Content APIs v4 for pristine Arabic scripts, translation metadata, Mishary Rashid audio streams, and Ibn Kathir English tafsir drawers.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white border border-border rounded-sm p-8 hover:shadow-md transition-all flex gap-4">
            <div className="text-green mt-1"><Users className="w-6 h-6" /></div>
            <div>
              <h4 className="font-cinzel text-lg text-green font-medium mb-2">Private Multiplayer Circles</h4>
              <p className="font-cormorant text-base text-ink-soft leading-relaxed">
                Invite-only reflection circles sync through QF Rooms APIs. Share daily readings, like members' posts, and provide spiritual support with complete privacy control.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white border border-border rounded-sm p-8 hover:shadow-md transition-all flex gap-4">
            <div className="text-gold mt-1"><Award className="w-6 h-6" /></div>
            <div>
              <h4 className="font-cinzel text-lg text-green font-medium mb-2">Progressive Gamification</h4>
              <p className="font-cormorant text-base text-ink-soft leading-relaxed">
                Track consistency with streaks linked to QF Streaks APIs. Advance through 5 visually-inspiring levels from Seeker (طالب) to Guide (مرشد) as your XP accumulates.
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="bg-white border border-border rounded-sm p-8 hover:shadow-md transition-all flex gap-4">
            <div className="text-green mt-1"><Calendar className="w-6 h-6" /></div>
            <div>
              <h4 className="font-cinzel text-lg text-green font-medium mb-2">Personal Verse Journal</h4>
              <p className="font-cormorant text-base text-ink-soft leading-relaxed">
                An elegant timelines of all your historical notes. Easily search, read through past life contexts, and track how your relationship with different verses evolved.
              </p>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="bg-white border border-border rounded-sm p-8 hover:shadow-md transition-all flex gap-4">
            <div className="text-gold mt-1"><Shield className="w-6 h-6" /></div>
            <div>
              <h4 className="font-cinzel text-lg text-green font-medium mb-2">Off-Grid Cloud Syncing</h4>
              <p className="font-cormorant text-base text-ink-soft leading-relaxed">
                Our dual authentication backend connects to official QF OAuth2 authorization servers. Your streaks, notes, and activity days are backed up securely inside QF databases.
              </p>
            </div>
          </div>

          {/* Feature 6 */}
          <div className="bg-white border border-border rounded-sm p-8 hover:shadow-md transition-all flex gap-4">
            <div className="text-green mt-1"><Flame className="w-6 h-6" /></div>
            <div>
              <h4 className="font-cinzel text-lg text-green font-medium mb-2">Interactive AI Actions</h4>
              <p className="font-cormorant text-base text-ink-soft leading-relaxed">
                Receive context-aware daily suggestions built on OpenRouter LLM technology to help you implement your commitments. Small actionable tips, rendered instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BOTTOM CTA SECTION ─── */}
      <section className="bg-green text-white py-20 relative overflow-hidden">
        {/* Decorative pattern overlays */}
        <div className="absolute inset-0 opacity-[0.04] bg-repeat pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.4'%3E%3Cpolygon points='30,2 56,16 56,44 30,58 4,44 4,16'/%3E%3C/g%3E%3C/svg%3E")` }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
          <div className="flex items-center justify-center gap-1.5 text-gold-light text-xs font-semibold font-cinzel tracking-[0.2em] uppercase">
            <span>❧ ✦ ❧</span>
            <span>Begin Your Growth</span>
            <span>❧ ✦ ❧</span>
          </div>

          <h3 className="font-cinzel text-4xl sm:text-5xl font-medium tracking-tight leading-tight">
            "Read. Reflect. Grow Together."
          </h3>

          <p className="font-cormorant text-xl text-emerald-100 max-w-xl mx-auto leading-relaxed">
            Join a modern, distraction-free Quran companion platform designed to build a deep, reflective daily connection.
          </p>

          <button
            onClick={handleStartCTA}
            className="inline-flex items-center gap-2 font-cinzel tracking-wider uppercase text-sm font-semibold text-green bg-white hover:bg-gold-faint px-8 py-4 rounded-sm shadow-lg transition-all"
          >
            {isAuthenticated ? 'Enter Application' : 'Create Your Account'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-ink text-muted py-12 border-t border-border/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-baseline gap-2">
            <span className="font-cinzel font-medium text-lg tracking-[0.06em] text-white">Tadabbur</span>
            <span className="font-scheherazade text-lg text-gold leading-none" lang="ar" dir="rtl">تدبّر</span>
          </div>
          
          <p className="font-cormorant text-sm text-center sm:text-right">
            © 2026 Tadabbur. Built for the Quran Foundation Hackathon 2026.
          </p>
        </div>
      </footer>
    </div>
  )
}
