import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bonded: The first college connection network',
  description:
    'Bonded is the first college connection network — find new friends, roommates, and clubs on your campus.',
  keywords: 'college, campus, social network, student connections, university',
  icons: {
    icon: '/img/transparent-bonded.png',
  },
  openGraph: {
    title: 'Bonded: The first college connection network',
    description:
      'Find new friends, roommates, and clubs on your campus with Bonded, the first college connection network.',
    images: ['/img/transparent-bonded.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bonded: The first college connection network',
    description:
      'Find new friends, roommates, and clubs on your campus with Bonded, the first college connection network.',
    images: ['/img/transparent-bonded.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}












