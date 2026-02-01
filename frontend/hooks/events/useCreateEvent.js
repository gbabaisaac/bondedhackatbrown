import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEvent } from '../../api/events/createEvent'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

/**
 * Hook to create a new event
 * Handles event creation with ticket types and invites
 */
export function useCreateEvent() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventData) => {
      if (!user) {
        throw new Error('User must be authenticated to create events')
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw profileError
      }
      if (!profile?.university_id) {
        throw new Error('University is required to create events')
      }

      // Map calendar event data to database schema
      const eventInput = {
        organizer_id: eventData.organizer_id || user.id,
        organizer_type: eventData.organizer_type || (eventData.org_id ? 'org' : 'user'),
        title: eventData.title,
        description: eventData.description || null,
        image_url: eventData.image_url || null,
        start_at: eventData.start_at,
        end_at: eventData.end_at,
        location_name: eventData.location_name || null,
        location_address: eventData.location_address || eventData.location_name || null,
        visibility: eventData.visibility || 'public',
        org_id: eventData.org_id || null,
        requires_approval: eventData.requires_approval || false,
        hide_guest_list: eventData.hide_guest_list || false,
        allow_sharing: eventData.allow_sharing !== false,
        is_paid: eventData.is_paid || false,
        created_by: user.id,
        source: 'user',
        type: eventData.type || 'event',
        university_id: profile.university_id,
        ticket_types: eventData.ticket_types || [],
        invites: eventData.invites || [],
        sticker: eventData.sticker || null,
        is_recurring: eventData.is_recurring || false,
        recurring_frequency: eventData.recurring_frequency || null,
        recurring_days: eventData.recurring_days || [],
        recurring_end_date: eventData.recurring_end_date || null,
      }

      console.log('Creating event with data:', eventInput)
      const result = await createEvent(eventInput)
      console.log('Event created successfully:', result)
      return result
    },
    onSuccess: (data) => {
      console.log('✅ Event created, invalidating queries:', {
        eventId: data?.id,
        title: data?.title,
      })

      // Invalidate events queries to refetch
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['eventsForUser'] })

      console.log('🔄 Queries invalidated - events should refetch')
    },
    onError: (error) => {
      console.error('❌ Event creation failed:', error)
    },
    retry: 1,
  })
}




