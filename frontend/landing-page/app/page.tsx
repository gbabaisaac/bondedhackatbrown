'use client'

import AnimatedSubtitle from '@/components/AnimatedSubtitle'
import PhoneMockup from '@/components/PhoneMockup'
import WaitlistForm from '@/components/WaitlistForm'
import { motion, useScroll, useTransform } from 'framer-motion'

export default function Home() {
  const { scrollYProgress } = useScroll()

  // Parallax effects for floating shapes
  const purpleY1 = useTransform(scrollYProgress, [0, 1], [0, -400])
  const purpleY2 = useTransform(scrollYProgress, [0, 1], [0, 300])

  const features = [
    {
      id: 'yearbook',
      image: '/img/Simulator Screenshot - iPhone 17 Pro - yearbook.png',
      headline: 'Find your people on campus.',
      subline: 'Discover classmates, study partners, and people who share your interests through our interactive yearbook.',
    },
    {
      id: 'events',
      image: '/img/Simulator Screenshot - iPhone 17 Pro - events.png',
      headline: 'Never miss what\'s happening.',
      subline: 'Find and join events happening around campus. From club meetings to campus concerts.',
    },
    {
      id: 'clubs',
      image: '/img/Simulator Screenshot - iPhone 17 Pro - clubs.png',
      headline: 'A home for every club and org.',
      subline: 'Connect with clubs, teams, and organizations. Manage members, events, and communication in one place.',
    },
    {
      id: 'forum',
      image: '/img/Simulator Screenshot - iPhone 17 Pro - forum.png',
      headline: 'Join the campus conversation.',
      subline: 'Anonymous forums, class discussions, and topic-based communities for every interest.',
    },
    {
      id: 'calendar',
      image: '/img/bonded-calandar.png',
      headline: 'Your schedule, supercharged.',
      subline: 'Import your class schedule. See when friends are free. Plan study sessions and hangouts effortlessly.',
    },
    {
      id: 'link-ai',
      image: '/img/Simulator Screenshot - iPhone 17 Pro -linkai.png',
      headline: 'Meet Link, your AI wingman.',
      subline: 'Link AI helps you break the ice, find conversation starters, and make meaningful connections.',
    },
  ]

  return (
    <main className="min-h-screen bg-white relative overflow-hidden">
      {/* Floating Purple Accent Shapes - Saturn-style subtle gradients */}
      <motion.div
        style={{ y: purpleY1 }}
        className="fixed top-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-purple-200/40 via-purple-100/20 to-transparent rounded-full pointer-events-none z-0"
      />
      <motion.div
        style={{ y: purpleY2 }}
        className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-purple-300/30 via-purple-100/10 to-transparent rounded-full pointer-events-none z-0"
      />

      {/* Navigation - Clean Saturn-inspired sticky nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold tracking-tight text-gray-900">Bonded</div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">Features</a>
            <a href="#waitlist" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">Waitlist</a>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <a href="https://www.linkedin.com/company/getbondedapp" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-600 transition-colors" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="https://www.instagram.com/bonded.io" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-600 transition-colors" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Saturn-style massive typography */}
      <section className="relative min-h-screen flex items-center px-6 pt-24 pb-20 z-10">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text Content */}
            <div className="flex flex-col justify-center order-2 lg:order-1">
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-gray-900 mb-8 leading-[0.95] tracking-tight"
              >
                The social network for college.
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="mb-10"
              >
                <AnimatedSubtitle />
              </motion.div>

              {/* Mobile Phone Preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.25 }}
                className="flex justify-center mb-10 lg:hidden"
              >
                <PhoneMockup
                  src="/img/Simulator Screenshot - iPhone 17 Pro - drawer.png"
                  alt="Bonded App"
                  priority
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mb-6"
              >
                <WaitlistForm variant="hero" />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.45 }}
                className="text-base text-gray-500"
              >
                <span className="text-purple-600 font-semibold">Live at University of Rhode Island</span>
                <span className="mx-2">•</span>
                Coming to more campuses soon
              </motion.p>
            </div>

            {/* Right - Phone (Desktop) */}
            <motion.div
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:flex items-center justify-center lg:justify-end order-1 lg:order-2"
            >
              <div className="relative">
                <div className="absolute -inset-20 bg-gradient-radial from-purple-200/50 via-purple-100/20 to-transparent rounded-full blur-3xl" />
                <PhoneMockup
                  src="/img/Simulator Screenshot - iPhone 17 Pro - drawer.png"
                  alt="Bonded App"
                  priority
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Sections - Saturn-style full-bleed alternating sections */}
      <div id="features">
        {features.map((feature, index) => {
          const isOdd = index % 2 === 1
          return (
            <section
              key={feature.id}
              className={`relative py-24 md:py-32 px-6 z-10 ${isOdd ? 'bg-gray-50' : 'bg-white'}`}
            >
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                  {/* Phone */}
                  <motion.div
                    initial={{ opacity: 0, x: isOdd ? 60 : -60 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex justify-center ${isOdd ? 'lg:order-2' : 'lg:order-1'}`}
                  >
                    <div className="relative">
                      <div className="absolute -inset-16 bg-gradient-radial from-purple-200/40 to-transparent rounded-full blur-2xl" />
                      <PhoneMockup src={feature.image} alt={feature.headline} />
                    </div>
                  </motion.div>

                  {/* Text */}
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex flex-col justify-center ${isOdd ? 'lg:order-1' : 'lg:order-2'}`}
                  >
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
                      {feature.headline}
                    </h2>
                    <p className="text-xl text-gray-600 leading-relaxed">
                      {feature.subline}
                    </p>
                  </motion.div>
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {/* CTA Section - Saturn-style bold statement */}
      <section id="waitlist" className="relative py-32 md:py-40 px-6 bg-gradient-to-b from-white via-purple-50/50 to-purple-100/30 z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight"
          >
            Bonded is available at select campuses.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto"
          >
            We're expanding to campuses with the most interest. Join the waitlist and help bring Bonded to your school.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-xl mx-auto"
          >
            <WaitlistForm variant="cta" />
          </motion.div>
        </div>
      </section>

      {/* Footer - Clean minimal Saturn style */}
      <footer className="relative py-12 px-6 border-t border-gray-100 z-10 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="text-xl font-bold text-gray-900">Bonded</div>
            <nav className="flex items-center gap-8 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900 transition-colors">About</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Contact</a>
            </nav>
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Bonded. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
