import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const recordedViews = new Set()

const getTodayKey = () => new Date().toISOString().slice(0, 10)

export function useProfileViewTracker(viewedUserId, source, enabled = true) {
  const { user } = useAuthStore()

  useEffect(() => {
    if (!enabled) return
    if (!user?.id || !viewedUserId) return
    if (user.id === viewedUserId) return

    const dayKey = getTodayKey()
    const dedupeKey = `${user.id}:${viewedUserId}:${dayKey}`

    if (recordedViews.has(dedupeKey)) return
    recordedViews.add(dedupeKey)

    supabase
      .from('profile_views')
      .upsert(
        {
          viewer_id: user.id,
          viewed_id: viewedUserId,
          viewed_on: dayKey,
          viewed_at: new Date().toISOString(),
          source: source || null,
        },
        { onConflict: 'viewer_id,viewed_id,viewed_on' }
      )
      .then(({ error }) => {
        if (error) {
          console.warn('Failed to record profile view:', error)
        }
      })
  }, [enabled, source, user?.id, viewedUserId])
}

export function useProfileViewersCount(userId, { windowDays = 30 } = {}) {
  return useQuery({
    queryKey: ['profileViewers', userId, windowDays],
    queryFn: async () => {
      if (!userId) return 0

      const since = new Date()
      since.setDate(since.getDate() - windowDays)

      const { data, error } = await supabase
        .from('profile_views')
        .select('viewer_id, viewed_at')
        .eq('viewed_id', userId)
        .gte('viewed_at', since.toISOString())

      if (error) {
        console.warn('Failed to fetch profile viewers:', error)
        return 0
      }

      const unique = new Set((data || []).map((row) => row.viewer_id))
      return unique.size
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}
