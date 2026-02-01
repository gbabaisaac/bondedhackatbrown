'use client'

import { motion, MotionValue, useTransform } from 'framer-motion'
import Image from 'next/image'

interface ScreenProps {
  screen: {
    id: string
    src: string
    alt: string
  }
  index: number
  totalScreens: number
  scrollProgress: MotionValue<number>
}

function Screen({ screen, index, totalScreens, scrollProgress }: ScreenProps) {
  const startProgress = index / totalScreens
  const endProgress = (index + 1) / totalScreens
  
  const opacity = useTransform(
    scrollProgress,
    [Math.max(0, startProgress - 0.1), startProgress, endProgress, Math.min(1, endProgress + 0.1)],
    [0, 1, 1, 0]
  )
  
  const y = useTransform(
    scrollProgress,
    [Math.max(0, startProgress - 0.1), startProgress, endProgress, Math.min(1, endProgress + 0.1)],
    [12, 0, 0, -12]
  )

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        opacity,
        y,
      }}
    >
      <Image
        src={screen.src}
        alt={screen.alt}
        fill
        className="object-cover"
        sizes="360px"
        priority={index === 0}
      />
    </motion.div>
  )
}

interface ScrollPhoneMockupProps {
  screens: Array<{
    id: string
    src: string
    alt: string
  }>
  scrollProgress: MotionValue<number>
}

export default function ScrollPhoneMockup({ screens, scrollProgress }: ScrollPhoneMockupProps) {
  return (
    <div className="relative w-full max-w-[360px] mx-auto">
      {/* Phone Frame */}
      <div className="relative bg-black rounded-[32px] p-[1px] border border-white/15 shadow-2xl">
        <div className="relative w-full rounded-[31px] overflow-hidden bg-black">
          {/* Inner shadow for depth */}
          <div className="absolute inset-0 rounded-[31px] shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] pointer-events-none z-10" />
          
          {/* Screen Container */}
          <div className="relative aspect-[9/19.5] overflow-hidden">
            {screens.map((screen, index) => (
              <Screen
                key={screen.id}
                screen={screen}
                index={index}
                totalScreens={screens.length}
                scrollProgress={scrollProgress}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
