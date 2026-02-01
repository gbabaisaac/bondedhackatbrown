'use client'

import Image from 'next/image'

interface PhoneMockupProps {
  src: string
  alt: string
  className?: string
  priority?: boolean
}

export default function PhoneMockup({ src, alt, className = '', priority = false }: PhoneMockupProps) {
  return (
    <div className={`relative w-full max-w-[320px] lg:max-w-[400px] xl:max-w-[450px] ${className}`}>
      {/* iPhone Frame with proper bezels and styling */}
      <div className="relative bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-[3rem] p-[8px] shadow-[0_25px_80px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.15)_inset]">
        {/* Outer bezel highlight */}
        <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-b from-white/15 via-transparent to-black/30 pointer-events-none" />
        
        {/* Screen Container */}
        <div className="relative w-full rounded-[2.75rem] overflow-hidden bg-black">
          {/* Inner screen shadow for depth */}
          <div className="absolute inset-0 rounded-[2.75rem] shadow-[inset_0_0_40px_rgba(0,0,0,0.6)] pointer-events-none z-10" />
          
          {/* Screen Content - Using explicit dimensions */}
          <div className="relative w-full" style={{ aspectRatio: '9 / 19.5' }}>
            <Image
              src={src}
              alt={alt}
              width={390}
              height={844}
              className="w-full h-auto object-cover rounded-[2.75rem]"
              sizes="(max-width: 768px) 320px, (max-width: 1280px) 400px, 450px"
              priority={priority}
            />
          </div>
        </div>
        
        {/* Side buttons indicator (subtle) */}
        <div className="absolute left-0 top-[30%] w-[4px] h-[60px] bg-gradient-to-r from-gray-700/60 to-transparent rounded-r-full" />
        <div className="absolute left-0 top-[45%] w-[4px] h-[80px] bg-gradient-to-r from-gray-700/60 to-transparent rounded-r-full" />
        <div className="absolute right-0 top-[30%] w-[4px] h-[60px] bg-gradient-to-l from-gray-700/60 to-transparent rounded-l-full" />
      </div>
    </div>
  )
}












