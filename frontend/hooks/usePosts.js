import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { resolveMediaUrls } from '../helpers/mediaStorage'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { getTimeAgo } from '../utils/dateFormatters'

const POSTS_PER_PAGE = 20 // Number of posts to fetch per page

/**
 * Hook to fetch posts for a forum with pagination
 * Returns posts from the specified forum, respecting RLS policies
 */
export function usePosts(forumId, filters = {}) {
  const { user } = useAuthStore()

  return useInfiniteQuery({
    queryKey: ['posts', forumId, filters, user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) {
        throw new Error('User must be authenticated to view posts')
      }

      if (!forumId) {
        return { posts: [], hasMore: false }
      }

      // Calculate pagination offset
      const offset = pageParam * POSTS_PER_PAGE

      // Build query
      let query = supabase
        .from('posts')
        .select(`
          id,
          forum_id,
          user_id,
          org_id,
          title,
          body,
          tags,
          media_urls,
          is_anonymous,
          upvotes_count,
          downvotes_count,
          comments_count,
          reposts_count,
          created_at,
          updated_at,
          deleted_at,
          author:profiles!posts_user_id_fkey(
            id,
            username,
            full_name,
            avatar_url,
            email
          ),
          organization:organizations(
            id,
            name,
            logo_url
          ),
          forum:forums(
            id,
            name,
            type,
            description
          ),
          comment_stats:forum_comments(count),
          reactions:post_reactions(count),
          poll:polls(
            id,
            question,
            options,
            expires_at
          )
        `)
        .eq('forum_id', forumId)
        .is('deleted_at', null) // Only non-deleted posts
        .order('created_at', { ascending: false })
        .range(offset, offset + POSTS_PER_PAGE - 1) // Pagination

      // Apply tag filter if provided
      if (filters.tag) {
        query = query.contains('tags', [filters.tag])
      }

      // Apply search filter if provided
      if (filters.search) {
        const search = filters.search.toLowerCase().trim()
        query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching posts:', error)
        throw error
      }

      // Transform data to match Forum component expectations
      const resolvedPosts = await Promise.all(
        (data || []).map(async (post) => {
          const resolvedMedia = await resolveMediaUrls(post.media_urls || [])

          // Determine author info (org takes precedence over user)
          const isOrgPost = !!post.org_id && !!post.organization
          const author = isOrgPost
            ? post.organization.name
            : post.is_anonymous
              ? 'Anon'
              : (post.author?.username && post.author.username.trim() !== ''
                  ? post.author.username
                  : (post.author?.email ? post.author.email.split('@')[0] : 'Anonymous'))
          const authorAvatar = isOrgPost
            ? post.organization.logo_url
            : post.author?.avatar_url || null

          return {
            id: post.id,
            author,
            isAnon: post.is_anonymous || false,
            isOrgPost,
            orgId: post.org_id || null,
            title: post.title,
            body: post.body,
            forum: post.forum?.name || 'Unknown',
            forumId: post.forum_id,
            upvotes: post.upvotes_count || 0,
            downvotes: post.downvotes_count || 0,
            score: (post.upvotes_count || 0) - (post.downvotes_count || 0),
            commentsCount: post.comment_stats?.[0]?.count ?? post.comments_count ?? 0,
            repostsCount: post.reposts_count || 0,
            timeAgo: getTimeAgo(post.created_at),
            tags: Array.isArray(post.tags) ? post.tags : [],
            media: resolvedMedia.map((url) => ({ uri: url, type: 'image' })),
            createdAt: post.created_at,
            userId: post.user_id,
            anonNumber: post.is_anonymous ? (parseInt(post.user_id.replace(/[^0-9]/g, '').slice(-2)) || 1) : null,
            authorAvatar,
            poll: post.poll || null,
          }
        })
      )

      // Return paginated result
      return {
        posts: resolvedPosts,
        hasMore: resolvedPosts.length === POSTS_PER_PAGE, // If we got a full page, there might be more
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      // If last page had fewer posts than POSTS_PER_PAGE, we've reached the end
      if (!lastPage?.hasMore) {
        return undefined
      }
      // Return next page number
      return allPages.length
    },
    initialPageParam: 0,
    enabled: !!user && !!forumId, // Only run if user is authenticated and forumId exists
    staleTime: 30 * 1000, // 30 seconds - posts update frequently, need fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for quick access
    refetchOnMount: true, // Always refetch to get new posts
    refetchOnWindowFocus: true, // Refetch when app regains focus
    refetchOnReconnect: true, // Refetch if connection was lost
    refetchInterval: 15000, // Keep forum feed fresh
    retry: 1,
  })
}

/**
 * Hook to fetch a single post by ID
 */
export function usePost(postId) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['post', postId, user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('User must be authenticated to view posts')
      }

      if (!postId) {
        throw new Error('Post ID is required')
      }

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*),
          organization:organizations(id, name, logo_url),
          forum:forums(*),
          poll:polls(*)
        `)
        .eq('id', postId)
        .is('deleted_at', null)
        .single()

      if (error) {
        console.error('Error fetching post:', error)
        throw error
      }

      return data
    },
    enabled: !!user && !!postId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  })
}

/**
 * Helper function to calculate time ago
 */
