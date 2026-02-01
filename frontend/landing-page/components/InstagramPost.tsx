'use client'

import Image from 'next/image'

interface InstagramPostProps {
  title: string
  description: string
  phoneImage: string
  phoneAlt: string
  gradient?: string
}

export default function InstagramPost({
  title,
  description,
  phoneImage,
  phoneAlt,
  gradient = 'from-purple-500 to-purple-700',
}: InstagramPostProps) {
  return (
    <div className="w-full max-w-[1080px] aspect-[4/5] bg-white rounded-2xl overflow-hidden shadow-2xl">
      {/* Instagram Story/Post Format */}
      <div className="relative w-full h-full flex flex-col">
        {/* Gradient Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />
        
        {/* Content Container */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-12 py-16">
          {/* Phone Mockup */}
          <div className="mb-8">
            <div className="relative w-[280px] h-[560px]">
              <div className="absolute inset-0 bg-black rounded-[2.5rem] p-[6px] shadow-2xl">
                <div className="relative w-full h-full rounded-[2.25rem] overflow-hidden bg-black">
                  <Image
                    src={phoneImage}
                    alt={phoneAlt}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="text-center space-y-4 max-w-2xl">
            <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              {title.split('\n').map((line, idx) => (
                <span key={idx}>
                  {line}
                  {idx < title.split('\n').length - 1 && <br />}
                </span>
              ))}
            </h2>
            <p className="text-xl sm:text-2xl text-white/90 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Bonded Logo/Branding */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className="text-white/80 text-lg font-semibold">@bonded.io</div>
          </div>
        </div>
      </div>
    </div>
  )
}
