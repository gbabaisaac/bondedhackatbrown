/**
 * Hook to fetch stories from Supabase
 * Replaces mock data in StoriesContext
 */

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

/**
 * Fetch stories for a specific forum (or all forums)
 * @param {string} forumId - Optional forum ID to filter stories
 */
export function useStories(forumId = null) {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: ['stories', forumId, user?.id],
    queryFn: async () => {
      if (!user) {
        return []
      }

      // Get user's university for filtering
      const { data: profile } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', user.id)
        .single()

      if (!profile?.university_id) {
        return []
      }

      // Build query
      let query = supabase
        .from('stories')
        .select(`
          *,
          user:profiles!stories_user_id_fkey(id, full_name, avatar_url, username),
          forum:forums(id, name, type)
        `)
        .gt('expires_at', new Date().toISOString()) // Only active stories
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Filter by forum if provided
      if (forumId) {
        query = query.eq('forum_id', forumId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching stories:', error)
        throw error
      }

      // Transform data to match StoriesContext expectations
      return (data || []).map((story) => ({
        id: story.id,
        userId: story.user_id,
        userName: story.user?.full_name || story.user?.username || 'Anonymous',
        userAvatar: story.user?.avatar_url,
        forumId: story.forum_id,
        forumName: story.forum?.name,
        mediaUrl: story.media_url,
        mediaType: story.media_type,
        caption: story.caption,
        visibility: story.visibility,
        expiresAt: story.expires_at,
        viewCount: story.view_count || 0,
        isHighlighted: story.is_highlighted || false,
        createdAt: story.created_at,
        // Add reactions/comments if needed (separate queries)
        reactions: [],
        comments: [],
      }))
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute (stories change frequently)
    retry: 1,
  })
}

/**
 * Fetch stories grouped by forum
 * Returns: { [forumId]: [stories] }
 */
export function useStoriesByForum() {
  const { data: stories = [], isLoading, error } = useStories()
  
  // Group stories by forum_id
  const storiesByForum = useMemo(() => {
    const grouped = {}
    
    stories.forEach((story) => {
      const forumId = story.forumId || 'all'
      if (!grouped[forumId]) {
        grouped[forumId] = []
      }
      grouped[forumId].push(story)
    })
    
    return grouped
  }, [stories])
  
  return {
    storiesByForum,
    isLoading,
    error,
  }
}









