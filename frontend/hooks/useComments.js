import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { getTimeAgo } from '../utils/dateFormatters'

export function useComments(postId) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['comments', postId, user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('User must be authenticated to view comments')
      }

      if (!postId) return []

      const { data, error } = await supabase
        .from('forum_comments')
        .select(`
          id,
          post_id,
          user_id,
          parent_id,
          body,
          is_anonymous,
          upvotes_count,
          downvotes_count,
          created_at,
          updated_at,
          deleted_at,
          author:profiles!forum_comments_user_id_fkey(
            id,
            username,
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('post_id', postId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching comments:', error)
        throw error
      }

      const commentMap = {}
      const roots = []

        ; (data || []).forEach((row) => {
          const authorLabel = row.is_anonymous
            ? 'Anonymous'
            : (
              row.author?.username?.trim()
                ? row.author.username
                : (row.author?.full_name?.trim()
                  ? row.author.full_name
                  : (row.author?.email ? row.author.email.split('@')[0] : 'Anonymous'))
            )

          commentMap[row.id] = {
            id: row.id,
            userId: row.user_id,
            author: authorLabel,
            isAnon: row.is_anonymous || false,
            body: row.body,
            upvotes: row.upvotes_count || 0,
            downvotes: row.downvotes_count || 0,
            timeAgo: getTimeAgo(row.created_at),
            anonNumber: row.is_anonymous ? (parseInt(row.user_id.replace(/[^0-9]/g, '').slice(-2)) || 1) : null,
            authorAvatar: row.author?.avatar_url || null,
            createdAt: row.created_at,
            parentId: row.parent_id || null, // Store parent_id for filtering
            replies: [],
          }
        })

        ; (data || []).forEach((row) => {
          const comment = commentMap[row.id]
          if (row.parent_id && commentMap[row.parent_id]) {
            commentMap[row.parent_id].replies.push(comment)
          } else if (!row.parent_id) {
            roots.push(comment)
          }
        })

      return roots
    },
    enabled: !!user && !!postId,
    staleTime: 10 * 1000,
    refetchInterval: 15000,
    retry: 1,
  })
}
