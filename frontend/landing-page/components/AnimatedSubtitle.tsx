'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const phrases = [
  'Find study partners.',
  'Find roommates.',
  'Find your people.',
  'Find your clubs.',
]

export default function AnimatedSubtitle() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % phrases.length)
    }, 2200) // Snappier timing

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-14 sm:h-16 lg:h-20 flex items-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          initial={{ opacity: 0, y: 30, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -30, filter: 'blur(4px)' }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-2xl sm:text-3xl lg:text-4xl font-medium text-gray-500"
        >
          {phrases[currentIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}









