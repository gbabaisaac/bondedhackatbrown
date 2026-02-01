import React, { createContext, useContext, useEffect, useState } from 'react'
import { fetchUnsplashPhoto } from '../services/unsplashService'
import { useAuthStore } from '../stores/authStore'

const StoriesContext = createContext()

// Story-appropriate search terms for Unsplash
const STORY_SEARCH_TERMS = [
  'campus life',
  'college lifestyle',
  'student life',
  'university campus',
  'college dorm',
  'study session',
  'campus event',
  'college party',
  'university library',
  'college sports',
  'campus dining',
  'college friends',
  'university quad',
  'college graduation',
  'campus architecture',
]

// Generate mock stories for testing
// TODO: Replace with bonded-media uploads + public.media inserts (canonical media flow).
// Mock data removed - using real Supabase data
const generateMockStories = async () => {
  // Return empty - stories come from Supabase
  return []
  const now = new Date()
  const stories = {}
  
  // Helper to create story with variety
  const createStory = async (userId, userName, userAvatar, forumId, hoursAgo, textContent = null, stickerEmoji = null) => {
    const createdAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)
    
    const textVariations = [
      'Game day! 🏀',
      'Study session 📚',
      'Campus vibes ✨',
      'Coffee break ☕',
      'Late night coding 💻',
      'Weekend plans! 🎉',
      'Midterm prep 📝',
      'Hackathon time! 🚀',
      'Library grind 📖',
      'Friday vibes 🎊',
    ]
    
    const stickerVariations = ['🔥', '💯', '✨', '⭐', '❤️', '👍', '🎉', '🏆']
    
    const randomText = textContent || (Math.random() > 0.5 ? textVariations[Math.floor(Math.random() * textVariations.length)] : null)
    const randomSticker = stickerEmoji || (Math.random() > 0.6 ? stickerVariations[Math.floor(Math.random() * stickerVariations.length)] : null)
    
    // Fetch Unsplash image for story (portrait orientation, suitable for stories)
    const searchTerm = STORY_SEARCH_TERMS[Math.floor(Math.random() * STORY_SEARCH_TERMS.length)]
    const imageUri = await fetchUnsplashPhoto(searchTerm, 400, 800) // 400x800 for story format
    
    const story = {
      id: `story-${userId}-${Date.now()}-${Math.random()}`,
      userId,
      userName,
      userAvatar,
      forumId,
      imageUri,
      videoUri: null,
      mediaType: 'image',
      textElements: randomText ? [
        {
          id: 1,
          text: randomText,
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          size: 28 + Math.floor(Math.random() * 12),
          x: 150 + Math.floor(Math.random() * 100),
          y: 250 + Math.floor(Math.random() * 200),
          rotation: Math.random() > 0.8 ? (Math.random() - 0.5) * 15 : 0,
        },
      ] : [],
      stickerElements: randomSticker ? [
        {
          id: 1,
          emoji: randomSticker,
          x: 100 + Math.floor(Math.random() * 200),
          y: 150 + Math.floor(Math.random() * 300),
          size: 40 + Math.floor(Math.random() * 20),
          rotation: Math.random() > 0.7 ? (Math.random() - 0.5) * 20 : 0,
        },
      ] : [],
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      timeAgo: hoursAgo === 0 ? 'now' : hoursAgo < 1 ? 'just now' : `${hoursAgo}h ago`,
    }
    
    if (!stories[forumId]) {
      stories[forumId] = []
    }
    stories[forumId].push(story)
  }
  
  // Add stories to different forums
  const forumQuad = 'forum-quad'
  const forumEvents = 'forum-events'
  const forumAcademic = 'forum-academic'
  
  // Quad forum stories - lots of variety
  await createStory('user-1', 'Sarah Johnson', 'https://randomuser.me/api/portraits/women/1.jpg', forumQuad, 1)
  await createStory('user-2', 'Mike Chen', 'https://randomuser.me/api/portraits/men/2.jpg', forumQuad, 2)
  await createStory('user-3', 'Emma Davis', 'https://randomuser.me/api/portraits/women/3.jpg', forumQuad, 3)
  await createStory('user-4', 'Alex Rodriguez', 'https://randomuser.me/api/portraits/men/4.jpg', forumQuad, 4)
  await createStory('user-5', 'Jessica Lee', 'https://randomuser.me/api/portraits/women/5.jpg', forumQuad, 5)
  await createStory('user-6', 'David Kim', 'https://randomuser.me/api/portraits/men/6.jpg', forumQuad, 6)
  await createStory('user-7', 'Olivia Brown', 'https://randomuser.me/api/portraits/women/7.jpg', forumQuad, 7)
  await createStory('user-15', 'James Wilson', 'https://randomuser.me/api/portraits/men/15.jpg', forumQuad, 8)
  await createStory('user-16', 'Lily Martinez', 'https://randomuser.me/api/portraits/women/16.jpg', forumQuad, 9)
  await createStory('user-17', 'Daniel Taylor', 'https://randomuser.me/api/portraits/men/17.jpg', forumQuad, 10)
  await createStory('user-18', 'Sophie Garcia', 'https://randomuser.me/api/portraits/women/17.jpg', forumQuad, 11)
  await createStory('user-19', 'Ryan Anderson', 'https://randomuser.me/api/portraits/men/18.jpg', forumQuad, 12)
  
  // Events forum stories
  await createStory('user-8', 'Chris Wilson', 'https://randomuser.me/api/portraits/men/8.jpg', forumEvents, 1)
  await createStory('user-9', 'Sophia Martinez', 'https://randomuser.me/api/portraits/women/9.jpg', forumEvents, 2)
  await createStory('user-10', 'Ryan Taylor', 'https://randomuser.me/api/portraits/men/10.jpg', forumEvents, 3)
  await createStory('user-11', 'Isabella Garcia', 'https://randomuser.me/api/portraits/women/11.jpg', forumEvents, 4)
  await createStory('user-20', 'Mason White', 'https://randomuser.me/api/portraits/men/19.jpg', forumEvents, 5)
  await createStory('user-21', 'Ava Harris', 'https://randomuser.me/api/portraits/women/18.jpg', forumEvents, 6)
  await createStory('user-22', 'Lucas Clark', 'https://randomuser.me/api/portraits/men/20.jpg', forumEvents, 7)
  
  // Academic forum stories
  await createStory('user-12', 'Noah Anderson', 'https://randomuser.me/api/portraits/men/12.jpg', forumAcademic, 2)
  await createStory('user-13', 'Mia Thomas', 'https://randomuser.me/api/portraits/women/13.jpg', forumAcademic, 4)
  await createStory('user-14', 'Ethan Jackson', 'https://randomuser.me/api/portraits/men/14.jpg', forumAcademic, 6)
  await createStory('user-23', 'Charlotte Lewis', 'https://randomuser.me/api/portraits/women/19.jpg', forumAcademic, 8)
  await createStory('user-24', 'Benjamin Walker', 'https://randomuser.me/api/portraits/men/21.jpg', forumAcademic, 10)
  await createStory('user-25', 'Amelia Hall', 'https://randomuser.me/api/portraits/women/20.jpg', forumAcademic, 12)
  
  return stories
}

export function StoriesProvider({ children }) {
  // Initialize with empty stories - will be populated asynchronously
  const [forumStories, setForumStories] = useState({})
  const [isLoadingStories, setIsLoadingStories] = useState(false)
  
  // Check if user is authenticated
  const { user } = useAuthStore()

  // Load stories asynchronously on mount ONLY if user is authenticated
  useEffect(() => {
    if (!user) {
      // User not authenticated - don't load stories
      setIsLoadingStories(false)
      return
    }

    const loadStories = async () => {
      try {
        setIsLoadingStories(true)
        const stories = await generateMockStories()
        setForumStories(stories)
      } catch (error) {
        console.error('Error loading stories:', error)
        // Fallback to empty stories if there's an error
        setForumStories({})
      } finally {
        setIsLoadingStories(false)
      }
    }
    loadStories()
  }, [user])

  const [userStories, setUserStories] = useState([])
  const [viewedStories, setViewedStories] = useState(new Set())
  // Comments organized by story ID
  const [storyComments, setStoryComments] = useState({
    // 'story-id': [{ comment objects }]
  })

  // Add story to a specific forum
  const addStoryToForum = (forumId, story) => {
    setForumStories((prev) => ({
      ...prev,
      [forumId]: [
        {
          ...story,
          id: `story-${Date.now()}`,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        },
        ...(prev[forumId] || []),
      ],
    }))
  }

  // Get stories for a specific forum
  const getForumStories = (forumId) => {
    const stories = forumStories[forumId] || []
    // Filter out expired stories (24 hour limit)
    return stories.filter((story) => new Date(story.expiresAt) > new Date())
  }

  // Mark story segments as viewed
  const markStoryAsViewed = (storyId) => {
    setViewedStories((prev) => new Set([...prev, storyId]))
  }

  // Check if user has viewed a story
  const hasViewedStory = (storyId) => {
    return viewedStories.has(storyId)
  }

  // Delete story (user's own)
  const deleteStory = (forumId, storyId) => {
    setForumStories((prev) => ({
      ...prev,
      [forumId]: (prev[forumId] || []).filter((s) => s.id !== storyId),
    }))
  }

  // Get all user's posted stories
  const getUserPostedStories = (userId) => {
    const allStories = []
    Object.entries(forumStories).forEach(([forumId, stories]) => {
      stories.forEach((story) => {
        if (story.userId === userId) {
          allStories.push({ ...story, forumId })
        }
      })
    })
    return allStories
  }

  // Add comment to a story
  const addCommentToStory = (storyId, comment) => {
    setStoryComments((prev) => ({
      ...prev,
      [storyId]: [
        {
          ...comment,
          id: `comment-${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
        ...(prev[storyId] || []),
      ],
    }))
  }

  // Get comments for a story
  const getStoryComments = (storyId) => {
    return storyComments[storyId] || []
  }

  // Delete comment
  const deleteComment = (storyId, commentId) => {
    setStoryComments((prev) => ({
      ...prev,
      [storyId]: (prev[storyId] || []).filter((c) => c.id !== commentId),
    }))
  }

  return (
    <StoriesContext.Provider
      value={{
        forumStories,
        addStoryToForum,
        getForumStories,
        markStoryAsViewed,
        hasViewedStory,
        deleteStory,
        getUserPostedStories,
        addCommentToStory,
        getStoryComments,
        deleteComment,
      }}
    >
      {children}
    </StoriesContext.Provider>
  )
}

export const useStoriesContext = () => {
  const context = useContext(StoriesContext)
  if (!context) {
    throw new Error('useStoriesContext must be used within StoriesProvider')
  }
  return context
}
