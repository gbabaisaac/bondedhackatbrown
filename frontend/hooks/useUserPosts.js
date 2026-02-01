import { useQuery } from '@tanstack/react-query'
import { resolveMediaUrls } from '../helpers/mediaStorage'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useUserPosts(userId, limit = 3) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['userPosts', userId, limit, user?.id],
    queryFn: async () => {
      if (!user?.id || !userId) return []

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          forum_id,
          title,
          body,
          created_at,
          is_anonymous,
          comments_count,
          upvotes_count,
          downvotes_count,
          media_urls,
          org_id,
          forum:forums(
            id,
            name
          ),
          author:profiles!posts_user_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .eq('is_anonymous', false)
        .is('deleted_at', null)
        .is('org_id', null) // Only show personal posts, not posts made as org admin
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching user posts:', error)
        throw error
      }

      // Resolve media URLs
      const postsWithMedia = await Promise.all(
        (data || []).map(async (post) => {
          const resolvedMedia = await resolveMediaUrls(post.media_urls || [])
          return {
            ...post,
            media: resolvedMedia,
          }
        })
      )

      return postsWithMedia
    },
    enabled: !!user?.id && !!userId,
    staleTime: 30 * 1000,
    retry: 1,
  })
}
