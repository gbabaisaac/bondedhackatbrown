'use client'

import InstagramPost from '@/components/InstagramPost'

// Feature data (same as main page)
const features = [
  {
    id: 'yearbook',
    image: '/img/Simulator Screenshot - iPhone 17 Pro - yearbook.png',
    title: 'Find your people\non campus.',
    description: 'Discover classmates, study partners, and people who share your interests.',
  },
  {
    id: 'events',
    image: '/img/Simulator Screenshot - iPhone 17 Pro - events.png',
    title: 'Discover campus\nevents.',
    description: 'Find and join events happening around campus. Never miss out on what\'s happening.',
  },
  {
    id: 'clubs',
    image: '/img/Simulator Screenshot - iPhone 17 Pro - clubs.png',
    title: 'Join clubs and\norganizations.',
    description: 'Connect with clubs, teams, and organizations that match your interests.',
  },
  {
    id: 'forum',
    image: '/img/Simulator Screenshot - iPhone 17 Pro - forum.png',
    title: 'Join the\nconversation.',
    description: 'Connect through shared interests, campus events, and meaningful conversations.',
  },
  {
    id: 'calendar',
    image: '/img/bonded-calandar.png',
    title: 'Stay organized\nand connected.',
    description: 'Keep track of your schedule, classes, and important campus dates.',
  },
  {
    id: 'link-ai',
    image: '/img/Simulator Screenshot - iPhone 17 Pro -linkai.png',
    title: 'Intelligent assistance\nfor connections.',
    description: 'Link AI helps you find the right people and start meaningful conversations.',
  },
]

// Instagram post configurations for each feature
const instagramPosts = [
  {
    ...features[0], // yearbook
    gradient: 'from-purple-500 to-purple-700',
  },
  {
    ...features[1], // events
    gradient: 'from-blue-500 to-purple-600',
  },
  {
    ...features[2], // clubs
    gradient: 'from-pink-500 to-purple-600',
  },
  {
    ...features[3], // forum
    gradient: 'from-indigo-500 to-purple-600',
  },
  {
    ...features[4], // calendar
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    ...features[5], // link-ai
    gradient: 'from-purple-600 to-purple-800',
  },
]

export default function InstagramPostsPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Instagram Post Templates
          </h1>
          <p className="text-lg text-gray-600">
            Each section as an Instagram post. Screenshot or export these for your social media.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {instagramPosts.map((post, index) => (
            <div key={post.id} className="flex flex-col items-center">
              <InstagramPost
                title={post.title}
                description={post.description}
                phoneImage={post.image}
                phoneAlt={post.title}
                gradient={post.gradient}
              />
              <div className="mt-4 text-sm text-gray-500">
                Post {index + 1}: {post.id}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">How to Use:</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Visit this page: <code className="bg-gray-100 px-2 py-1 rounded">/instagram-posts</code></li>
            <li>Take screenshots of each post (1080x1350px - Instagram post size)</li>
            <li>Or use browser DevTools to export as image</li>
            <li>Post to Instagram with relevant hashtags</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
