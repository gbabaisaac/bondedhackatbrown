import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Logger } from '../../utils/logger'
import { isRlsRecursionError, logRlsFixHint } from '../../utils/rlsHelpers'

const EVENTS_PER_PAGE = 20 // Number of events to fetch per page

/**
 * Hook to fetch events for a user with pagination
 * Returns events the user can see based on visibility rules
 * Only fetches future events, sorted by start_at ascending
 */
export function useEventsForUser(userId) {
  console.log('🎯 useEventsForUser hook initialized for userId:', userId)

  return useInfiniteQuery({
    queryKey: ['eventsForUser', userId],
    queryFn: async ({ pageParam = 0 }) => {
      console.log('🔍 useEventsForUser queryFn executing:', { userId, pageParam, timestamp: new Date().toISOString() })

      if (!userId) {
        Logger.debug('⚠️ No userId provided to useEventsForUser')
        return { events: [], hasMore: false }
      }

      // Get user's university_id first
      // Note: If RLS recursion error occurs, we'll try a workaround
      let userProfile
      let universityId

      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('university_id')
          .eq('id', userId)
          .single()

        if (profileError) {
          // If RLS recursion error, try using auth.uid() directly or skip university filter
          if (isRlsRecursionError(profileError)) {
            console.warn('⚠️ RLS recursion error on profiles - fetching events without university filter')
            console.warn('💡 Run fix-rls-recursion.sql in Supabase to fix this')
            // Continue without university_id - no events returned
            universityId = null
          } else {
            console.error('Error fetching user profile:', profileError)
            throw profileError
          }
        } else {
          userProfile = data
          universityId = userProfile?.university_id
        }
      } catch (error) {
        console.error('Unexpected error fetching profile:', error)
        // Continue without university filter as fallback
        universityId = null
      }

      // Get user's org memberships
      // Note: Handle gracefully if column doesn't exist or RLS blocks access
      let orgIds = []
      try {
        const { data: orgMemberships, error: orgMembershipsError } = await supabase
          .from('org_members')
          .select('organization_id')
          .eq('user_id', userId)
          .in('role', ['member', 'admin'])

        if (orgMembershipsError) {
          // Check if it's a column doesn't exist error (42703) or RLS recursion
          if (orgMembershipsError.code === '42703') {
            console.warn('⚠️ org_members.organization_id column may not exist, trying alternative column name')
            // Try with org_id if organization_id doesn't exist
            const { data: altMemberships } = await supabase
              .from('org_members')
              .select('org_id')
              .eq('user_id', userId)
              .in('role', ['member', 'admin'])
            orgIds = altMemberships?.map((m) => m.org_id) || []
          } else if (isRlsRecursionError(orgMembershipsError)) {
            const table = orgMembershipsError?.message?.match(/relation \"(.+)\"/)?.[1] || 'org_members'
            logRlsFixHint(table)
            orgIds = []
          } else {
            console.warn('⚠️ Error fetching org memberships (non-critical):', orgMembershipsError.message)
            orgIds = []
          }
        } else {
          orgIds = orgMemberships?.map((m) => m.organization_id) || []
        }
      } catch (err) {
        console.warn('⚠️ Failed to fetch org memberships, continuing without org filter:', err.message)
        orgIds = []
      }

      // Get events user is attending
      const { data: attendance, error: attendanceError } = await supabase
        .from('event_attendance')
        .select('event_id')
        .eq('user_id', userId)
        .in('status', ['going', 'approved', 'maybe', 'requested'])

      if (attendanceError) {
        console.error('❌ Error fetching attendance:', attendanceError)
        if (isRlsRecursionError(attendanceError)) {
          const table = attendanceError?.message?.match(/relation \"(.+)\"/)?.[1] || 'event_attendance'
          logRlsFixHint(table)
        }
      }

      const attendingEventIds = attendance?.map((a) => a.event_id) || []

      if (!universityId) {
        console.warn('⚠️ No university_id found - returning no events')
        return { events: [], hasMore: false }
      }

      console.log('🔍 Fetching events (university_id:', universityId, ')')

      // Build visibility filter
      const visibilityFilter = `visibility.eq.public,visibility.eq.school,${orgIds.length > 0
          ? `and(visibility.eq.org_only,org_id.in.(${orgIds.join(',')}))`
          : 'id.eq.00000000-0000-0000-0000-000000000000' // Empty condition if no orgs
        }`

      // Query events - filter by university_id for clean campus isolation

      console.log('🔍 Fetching events (page:', pageParam, ')')

      // Get current time to filter out past events
      const now = new Date().toISOString()

      // Calculate pagination offset
      const offset = pageParam * EVENTS_PER_PAGE

      // Optimized: Try full query with joins first (most common case)
      // Only fall back to simpler queries if there's an error
      // Only fetch future events, sorted by start_at ascending
      // Note: Removed org:orgs join since there's no FK relationship - org_id is just a column
      // Must specify explicit FK name because there are multiple relationships (organizer_id and created_by)
      let query = supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!events_organizer_id_fkey(id, university_id, full_name, avatar_url),
          ticket_types:event_ticket_types(*),
          attendees_count:event_attendance(count)
        `)
        .or(visibilityFilter)
        .eq('university_id', universityId)
        .gte('start_at', now) // Only future events
        .order('start_at', { ascending: true })
        .range(offset, offset + EVENTS_PER_PAGE - 1) // Pagination

      let { data: events, error } = await query

      if (error) {
        Logger.error('❌ Error fetching events with joins:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })

        if (isRlsRecursionError(error)) {
          const table = error?.message?.match(/relation \"(.+)\"/)?.[1] || 'profiles'
          logRlsFixHint(table)
          // Try simple query without joins as fallback
          console.warn('⚠️ RLS recursion detected, trying simple query without joins')
          const { data: simpleEvents, error: simpleError } = await supabase
            .from('events')
            .select('*')
            .or(visibilityFilter)
            .eq('university_id', universityId)
            .gte('start_at', now) // Only future events
            .order('start_at', { ascending: true })
            .range(offset, offset + EVENTS_PER_PAGE - 1) // Pagination

          if (simpleError) {
            // Last resort: just public events
            console.warn('⚠️ Trying fallback: just public events')
            const { data: publicEvents, error: publicError } = await supabase
              .from('events')
              .select('*')
              .eq('visibility', 'public')
              .eq('university_id', universityId)
              .gte('start_at', now) // Only future events
              .order('start_at', { ascending: true })
              .range(offset, offset + EVENTS_PER_PAGE - 1) // Pagination

            if (publicError) {
              if (isRlsRecursionError(publicError)) {
                logRlsFixHint('events')
                // Return properly formatted result with rlsError flag for UI feedback
                return { events: [], hasMore: false, rlsError: true }
              }
              throw publicError
            }
            return {
              events: (publicEvents || []).map((event) => ({
                ...event,
                organizer: null,
                org: null,
                attendees_count: 0,
              })),
              hasMore: (publicEvents?.length || 0) === EVENTS_PER_PAGE,
              rlsError: true, // Indicate degraded mode due to RLS issues
            }
          }

          return {
            events: (simpleEvents || []).map((event) => ({
              ...event,
              organizer: null,
              org: null,
              attendees_count: 0,
            })),
            hasMore: (simpleEvents?.length || 0) === EVENTS_PER_PAGE,
            rlsError: true, // Indicate degraded mode due to RLS issues
          }
        }

        // For non-RLS errors, try simple query without joins
        console.warn('⚠️ Falling back to simple query without joins')
        const { data: simpleEvents, error: simpleError } = await supabase
          .from('events')
          .select('*')
          .or(visibilityFilter)
          .eq('university_id', universityId)
          .gte('start_at', now) // Only future events
          .order('start_at', { ascending: true })
          .range(offset, offset + EVENTS_PER_PAGE - 1) // Pagination

        if (simpleError) {
          throw simpleError
        }

        return {
          events: (simpleEvents || []).map((event) => ({
            ...event,
            organizer: null,
            org: null,
            attendees_count: 0,
          })),
          hasMore: (simpleEvents?.length || 0) === EVENTS_PER_PAGE,
        }
      }

      console.log(`✅ Fetched ${events?.length || 0} events with joins`)

      const filteredEvents = events || []

      // Transform attendees_count from array to number for regular events
      const transformedRegularEvents = filteredEvents.map((event) => ({
        ...event,
        attendees_count: Array.isArray(event.attendees_count)
          ? event.attendees_count[0]?.count || 0
          : event.attendees_count || 0,
      }))

      // Also get invite-only events user is invited to or attending
      // Note: For pagination, we fetch invite-only events separately but combine them
      // Since invite-only events are typically fewer, we fetch them all (not paginated)
      // and combine with paginated regular events
      let filteredInviteEvents = []
      if (pageParam === 0) {
        // Only fetch invite-only events on first page to avoid duplicates
        // Note: Removed org:orgs join since there's no FK relationship
        let inviteQuery = supabase
          .from('events')
          .select(`
            *,
            organizer:profiles!events_organizer_id_fkey(id, university_id, full_name, avatar_url),
            ticket_types:event_ticket_types(*),
            attendees_count:event_attendance(count)
          `)
          .eq('visibility', 'invite_only')
          .eq('university_id', universityId)
          .or(
            `id.in.(${attendingEventIds.join(',') || '00000000-0000-0000-0000-000000000000'})`
          )
          .gte('start_at', now) // Only future events
          .order('start_at', { ascending: true })

        const { data: inviteOnlyEvents, error: inviteError } = await inviteQuery

        if (inviteError) {
          console.error('❌ Error fetching invite-only events:', inviteError)
          if (isRlsRecursionError(inviteError)) {
            const table = inviteError?.message?.match(/relation \"(.+)\"/)?.[1] || 'profiles'
            logRlsFixHint(table)
            // If RLS recursion is blocking invite-only events, continue without them
            filteredInviteEvents = []
          }
          // Don't throw - just log and continue with regular events
        } else {
          filteredInviteEvents = inviteOnlyEvents || []
        }
      }

      // Transform invite-only events
      const transformedInviteEvents = filteredInviteEvents.map((event) => ({
        ...event,
        attendees_count: Array.isArray(event.attendees_count)
          ? event.attendees_count[0]?.count || 0
          : event.attendees_count || 0,
      }))

      // Combine and deduplicate (only on first page)
      let allEvents = transformedRegularEvents
      if (pageParam === 0 && transformedInviteEvents.length > 0) {
        const combined = [...transformedInviteEvents, ...transformedRegularEvents]
        allEvents = Array.from(
          new Map(combined.map((e) => [e.id, e])).values()
        )
        // Re-sort by start_at after combining
        allEvents.sort((a, b) => {
          const dateA = new Date(a.start_at || a.startDate || 0)
          const dateB = new Date(b.start_at || b.startDate || 0)
          return dateA - dateB
        })
      }

      // Return paginated result
      // For first page: return combined events (may be more than EVENTS_PER_PAGE due to invite-only)
      // For subsequent pages: return only regular events
      const result = {
        events: allEvents,
        hasMore: transformedRegularEvents.length === EVENTS_PER_PAGE, // Check if regular events have more pages
      }

      console.log('✅ Returning events page:', {
        pageParam,
        eventsCount: allEvents.length,
        hasMore: result.hasMore,
        sampleEvent: allEvents[0] ? { id: allEvents[0].id, title: allEvents[0].title, start_at: allEvents[0].start_at } : null,
      })

      return result
    },
    getNextPageParam: (lastPage, allPages) => {
      // If last page had fewer events than EVENTS_PER_PAGE, we've reached the end
      if (!lastPage?.hasMore) {
        return undefined
      }
      // Return next page number
      return allPages.length
    },
    initialPageParam: 0,
    enabled: !!userId, // Only run if userId is provided
    staleTime: 30 * 1000, // 30 seconds - events update frequently, need fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for quick access
    refetchOnMount: true, // Always refetch to get new events
    refetchOnWindowFocus: true, // Refetch when app regains focus to catch new events
    refetchOnReconnect: true, // Refetch if connection was lost
    retry: 1, // Only retry once on failure
  })
}
