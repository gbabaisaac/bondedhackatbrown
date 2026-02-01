import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

/**
 * Hook to create a new forum post
 * Returns a mutation that can be called to create a post
 */
export function useCreatePost() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ forumId, title, body, tags = [], mediaUrls = [], isAnonymous = false, poll = null }) => {
      if (!user) {
        throw new Error('User must be authenticated to create posts')
      }

      if (!forumId) {
        throw new Error('Forum ID is required')
      }

      if (!body || !body.trim()) {
        throw new Error('Post body is required')
      }

      const trimmedBody = body.trim()
      // Title is optional - use empty string if not provided (database requires non-null)
      const trimmedTitle = title?.trim() || ''

      // Create the post
      const postData = {
        forum_id: forumId,
        user_id: user.id,
        title: trimmedTitle, // Empty string for optional titles
        body: trimmedBody,
        tags: Array.isArray(tags) ? tags : [],
        media_urls: Array.isArray(mediaUrls) ? mediaUrls : [],
        is_anonymous: isAnonymous || false,
        org_id: null, // Will be set by caller if posting as org
        upvotes_count: 0,
        comments_count: 0,
        reposts_count: 0,
      }

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single()

      if (postError) {
        console.error('Error creating post:', postError)
        console.error('Post data attempted:', postData)
        // Create a more user-friendly error message
        const errorMessage = postError.message || postError.details || 'Failed to create post'
        const friendlyError = new Error(errorMessage)
        friendlyError.code = postError.code
        friendlyError.details = postError.details
        throw friendlyError
      }

      // If there's a poll, create it
      let pollCreationError = null
      if (poll && poll.question && poll.options && poll.options.length > 0) {
        const pollData = {
          post_id: post.id,
          question: poll.question,
          options: poll.options,
          expires_at: poll.expiresAt || null,
        }

        const { error: pollError } = await supabase
          .from('polls')
          .insert(pollData)

        if (pollError) {
          console.error('Error creating poll:', pollError)
          // Don't fail the whole post if poll creation fails, but track the error
          pollCreationError = pollError.message || 'Failed to create poll'
        }
      }

      // Return post with any poll error for UI feedback
      return {
        post,
        pollError: pollCreationError
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch posts for the forum
      queryClient.invalidateQueries({ queryKey: ['posts', variables.forumId] })
    },
    retry: 1,
  })
}
