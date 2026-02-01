import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Logger } from '../utils/logger'

/**
 * Unified hook to fetch all calendar-related data for a user
 * Consolidates events, organization activities, and personal tasks
 */
export function useCalendarData(userId, options = {}) {
    const { startDate, endDate } = options
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: ['calendarData', userId, startDate, endDate],
        queryFn: async () => {
            if (!userId) return { events: [], tasks: [], classes: [] }

            try {
                // 1. Fetch User Profile for university_id
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('university_id')
                    .eq('id', userId)
                    .single()

                if (!profile?.university_id) {
                    Logger.warn('No university_id found for user in useCalendarData')
                    return { events: [], tasks: [], classes: [] }
                }

                const universityId = profile.university_id

                // 2. Fetch Org Memberships for filtered visibility
                const { data: memberships } = await supabase
                    .from('org_members')
                    .select('organization_id')
                    .eq('user_id', userId)
                    .in('role', ['member', 'admin', 'owner'])

                const orgIds = memberships?.map(m => m.organization_id) || []

                // 3. Fetch Events & Tasks
                // We fetch everything in the range that the user has visibility for
                let query = supabase
                    .from('events')
                    .select(`
            *,
            organizer:profiles!events_organizer_id_fkey(id, full_name, avatar_url),
            attendance:event_attendance(status)
          `)
                    .eq('university_id', universityId)

                if (startDate) query = query.gte('start_at', startDate)
                if (endDate) query = query.lte('start_at', endDate)

                // Visibility Filter:
                // - Public or School-wide
                // - Org-only (if user is a member)
                // - Invite-only (if user is specifically attending/invited)
                // - User created them (personal tasks/events)
                const visibilityConditions = [
                    'visibility.eq.public',
                    'visibility.eq.school',
                    `organizer_id.eq.${userId}`
                ]

                if (orgIds.length > 0) {
                    visibilityConditions.push(`and(visibility.eq.org_only,org_id.in.(${orgIds.join(',')}))`)
                }

                const { data: allEvents, error: eventsError } = await query.or(visibilityConditions.join(','))

                if (eventsError) throw eventsError

                // 4. Fetch Class Enrollments for Schedule
                const { data: enrollments } = await supabase
                    .from('user_class_enrollments')
                    .select(`
            id,
            class_id,
            section_id,
            classes:classes(id, class_code, class_name),
            sections:class_sections(id, days_of_week, start_time, end_time, location, professor_name)
          `)
                    .eq('user_id', userId)

                // 5. Categorize and Return
                const events = allEvents?.filter(e => e.type !== 'task') || []
                const tasks = allEvents?.filter(e => e.type === 'task') || []

                // Transform classes into "events" for the calendar view if needed
                // This logic might be better handled in the UI or a helper, 
                // but adding it here for completeness of "Calendar Data"
                const normalizeDayOfWeek = (dayValue) => {
                    if (dayValue === null || dayValue === undefined) return null
                    if (typeof dayValue === 'number' && dayValue >= 0 && dayValue <= 6) return dayValue
                    const raw = String(dayValue).trim().toLowerCase()
                    if (!raw) return null
                    if (/^[0-6]$/.test(raw)) return Number(raw)

                    const dayMap = {
                        sunday: 0,
                        sun: 0,
                        su: 0,
                        monday: 1,
                        mon: 1,
                        m: 1,
                        tuesday: 2,
                        tue: 2,
                        tues: 2,
                        t: 2,
                        wednesday: 3,
                        wed: 3,
                        w: 3,
                        thursday: 4,
                        thu: 4,
                        thur: 4,
                        thurs: 4,
                        r: 4,
                        friday: 5,
                        fri: 5,
                        f: 5,
                        saturday: 6,
                        sat: 6,
                        s: 6,
                    }

                    return dayMap[raw] ?? null
                }

                const normalizeClassToken = (value) =>
                    (value || '')
                        .toString()
                        .trim()
                        .toLowerCase()
                        .replace(/\s+/g, '')
                        .replace(/[-_]/g, '')

                const formatClassTitle = (classCode, className) => {
                    const safeCode = (classCode || '').toString().trim()
                    const safeName = (className || '').toString().trim()
                    if (!safeCode && !safeName) return 'Class'
                    if (!safeName) return safeCode

                    const normalizedCode = normalizeClassToken(safeCode)
                    const normalizedName = normalizeClassToken(safeName)

                    if (!normalizedCode || normalizedCode === normalizedName) return safeCode || safeName
                    if (normalizedName.startsWith(normalizedCode)) return safeCode

                    return `${safeCode}: ${safeName}`
                }

                const classEvents = (enrollments || []).flatMap(enrollment => {
                    const { classes, sections } = enrollment
                    if (!sections || !sections.days_of_week) return []

                    return sections.days_of_week
                        .map((day) => normalizeDayOfWeek(day))
                        .filter((dayIndex) => dayIndex !== null)
                        .map(dayIndex => ({
                        id: `class-${enrollment.id}-${dayIndex}`,
                        title: formatClassTitle(classes?.class_code, classes?.class_name),
                        type: 'class',
                        start_at: sections.start_time, // This is just HH:mm, needs date injection in UI
                        end_at: sections.end_time,
                        location_name: sections.location,
                        organizer_name: sections.professor_name,
                        dayOfWeek: dayIndex, // 0-6
                        isRecurring: true
                    }))
                })

                return {
                    events,
                    tasks,
                    classes: enrollments || [],
                    recurringClassEvents: classEvents
                }

            } catch (error) {
                Logger.error('Error fetching calendar data:', error)
                throw error
            }
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}
