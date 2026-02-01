/**
 * Hook for managing forum and chat preferences
 * Handles opt-out functionality for auto-joining forums and chats
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

/**
 * Get user's forum preferences
 */
export function useForumPreferences() {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: ['forumPreferences', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const { data, error } = await supabase
        .from('profiles')
        .select('forum_preferences')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.error('Error fetching forum preferences:', error)
        return {
          autoJoinCourseForums: true,
          autoJoinSectionChats: true
        }
      }
      
      return data.forum_preferences || {
        autoJoinCourseForums: true,
        autoJoinSectionChats: true
      }
    },
    enabled: !!user
  })
}

/**
 * Update forum preferences
 */
export function useUpdateForumPreferences() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (preferences) => {
      if (!user) throw new Error('User must be authenticated')
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          forum_preferences: preferences
        })
        .eq('id', user.id)
        .select('forum_preferences')
        .single()
      
      if (error) throw error
      return data.forum_preferences
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forumPreferences'])
    }
  })
}

/**
 * Toggle auto-join for course forums
 */
export function useToggleCourseForums() {
  const updatePreferences = useUpdateForumPreferences()
  const { data: currentPreferences } = useForumPreferences()
  
  return useMutation({
    mutationFn: async () => {
      const newPreferences = {
        ...currentPreferences,
        autoJoinCourseForums: !currentPreferences?.autoJoinCourseForums
      }
      
      return await updatePreferences.mutateAsync(newPreferences)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forums'])
      queryClient.invalidateQueries(['conversations'])
    }
  })
}

/**
 * Toggle auto-join for section chats
 */
export function useToggleSectionChats() {
  const updatePreferences = useUpdateForumPreferences()
  const { data: currentPreferences } = useForumPreferences()
  
  return useMutation({
    mutationFn: async () => {
      const newPreferences = {
        ...currentPreferences,
        autoJoinSectionChats: !currentPreferences?.autoJoinSectionChats
      }
      
      return await updatePreferences.mutateAsync(newPreferences)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forums'])
      queryClient.invalidateQueries(['conversations'])
    }
  })
}
