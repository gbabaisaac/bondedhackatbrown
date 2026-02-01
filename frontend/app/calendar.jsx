import DateTimePicker from '@react-native-community/datetimepicker'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppTopBar from '../components/AppTopBar'
import BottomNav from '../components/BottomNav'
import Chip from '../components/Chip'
import ColorPicker from '../components/ColorPicker'
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, MapPin, Plus, Users } from '../components/Icons'
import { useClubsContext } from '../contexts/ClubsContext'
import { hp, wp } from '../helpers/common'
import { getEventColor as getEventColorFromTheme } from '../helpers/themeHelpers'
import { useCreateEvent } from '../hooks/events/useCreateEvent'
import { useDeleteEvent } from '../hooks/events/useDeleteEvent'
import { useCalendarData } from '../hooks/useCalendarData'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'
import { useFriends } from '../hooks/useFriends'
import { useAuthStore } from '../stores/authStore'
import { formatDate, formatDateShort, formatTime } from '../utils/dateFormatters'
import { useAppTheme } from './theme'
import { getFriendlyErrorMessage } from '../utils/userFacingErrors'

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// Color coding for events based on visibility/type (Google Calendar style)
// Now supports custom colors from user selection
// getEventColor is now imported from themeHelpers

// Get sticker for special days (holidays, special events)
const getDaySticker = (date) => {
  const month = date.getMonth() + 1 // 1-12
  const day = date.getDate()

  // Thanksgiving (4th Thursday of November)
  if (month === 11) {
    const firstThursday = new Date(date.getFullYear(), 10, 1)
    while (firstThursday.getDay() !== 4) {
      firstThursday.setDate(firstThursday.getDate() + 1)
    }
    const thanksgiving = new Date(firstThursday)
    thanksgiving.setDate(firstThursday.getDate() + 21) // 4th Thursday
    if (date.getDate() === thanksgiving.getDate() && date.getMonth() === thanksgiving.getMonth()) {
      return '🦃' // Turkey for Thanksgiving
    }
  }

  // New Year's Day
  if (month === 1 && day === 1) return '🎉'

  // Valentine's Day
  if (month === 2 && day === 14) return '❤️'

  // St. Patrick's Day
  if (month === 3 && day === 17) return '☘️'

  // Easter (simplified - first Sunday after first full moon after March 21)
  // For demo, using April 9 as placeholder

  // Independence Day
  if (month === 7 && day === 4) return '🇺🇸'

  // Halloween
  if (month === 10 && day === 31) return '🎃'

  // Christmas
  if (month === 12 && day === 25) return '🎄'

  // New Year's Eve
  if (month === 12 && day === 31) return '🎊'

  return null
}

// Get event type label
const getEventTypeLabel = (event) => {
  if (!event.org_id && event.visibility === 'invite_only') return 'Personal'
  if (event.visibility === 'org_only' && event.org_id) return 'Org'
  if (event.visibility === 'school') return 'Campus'
  if (event.visibility === 'public') return 'Public'
  return 'Event'
}

export default function Calendar() {
  const router = useRouter()
  const theme = useAppTheme()
  const styles = createStyles(theme)
  // Alias for convenience
  const getEventColor = (event) => getEventColorFromTheme(event, theme)
  const [viewMode, setViewMode] = useState('month') // 'month', 'week', 'day', 'schedule'
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [eventTypeFilter, setEventTypeFilter] = useState('all') // 'all', 'events', 'tasks', 'classes'
  const [showEventTypes, setShowEventTypes] = useState({
    events: true,
    tasks: true,
    personal: true,
    org: true,
    campus: true,
    social: true, // New category for social/party events
  })
  const { user } = useAuthStore()
  const { data: userProfile } = useCurrentUserProfile()
  const universityName = userProfile?.university?.name || 'Your University'
  const { getAdminClubs } = useClubsContext()
  const { data: friends } = useFriends()
  const { data: calendarData, isLoading: calendarLoading } = useCalendarData(user?.id)

  // Get user organizations for event creation
  const userOrgs = getAdminClubs()

  const currentUserId = user?.id || 'anonymous'

  // Flatten data from unified hook
  const allEvents = useMemo(() => {
    if (!calendarData) return []
    return [
      ...(calendarData.events || []),
      ...(calendarData.tasks || [])
    ]
  }, [calendarData])

  const recurringClassEvents = calendarData?.recurringClassEvents || []

  // Filter events that should appear in calendar based on type
  const calendarEvents = useMemo(() => {
    // Ensure allEvents is always an array
    if (!Array.isArray(allEvents)) {
      console.warn('⚠️ allEvents is not an array:', allEvents)
      return []
    }

    let filtered = allEvents

    // Filter by visibility toggle
    filtered = filtered.filter((event) => {
      const isTask = event.type === 'task'
      const isEvent = !isTask
      const isPersonal = !event.org_id && event.visibility === 'invite_only'
      const isOrg = event.visibility === 'org_only' && event.org_id
      const isCampus = event.visibility === 'school' || event.visibility === 'public'
      const isSocial = event.type === 'event' && event.visibility === 'public' && !event.org_id // Social/party events

      if (isTask && !showEventTypes.tasks) return false
      if (isEvent && !showEventTypes.events) return false
      if (isPersonal && !showEventTypes.personal) return false
      if (isOrg && !showEventTypes.org) return false
      if (isCampus && !showEventTypes.campus) return false
      if (isSocial && !showEventTypes.social) return false

      return true
    })

    // Filter by event type (simplified)
    if (eventTypeFilter === 'tasks') {
      filtered = filtered.filter((event) => event.type === 'task')
    } else if (eventTypeFilter === 'events') {
      filtered = filtered.filter((event) => event.type !== 'task' && event.type !== 'class')
    } else if (eventTypeFilter === 'classes') {
      // Show only class events (from recurring class schedule)
      filtered = filtered.filter((event) => event.type === 'class' || event.isClassEvent)
    }
    // 'all' shows everything, no additional filter needed

    return filtered
  }, [allEvents, eventTypeFilter, currentUserId, showEventTypes])

  const getUriSemesterStartDate = (date) => new Date(date.getFullYear(), 0, 20, 0, 0, 0)
  const getUriSemesterEndDate = (date) => new Date(date.getFullYear(), 4, 10, 23, 59, 59)

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const staticEvents = calendarEvents.filter((event) => {
      const eventDate = new Date(event.start_at)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })

    const semesterStart = getUriSemesterStartDate(date)
    const semesterEnd = getUriSemesterEndDate(date)
    if (date < semesterStart || date > semesterEnd) {
      return staticEvents
    }

    // Add recurring classes for this day of week
    const dayOfWeek = date.getDay() // 0-6
    const classesForDay = recurringClassEvents.filter(c => {
      // dayOfWeek in JS: 0 (Sun) - 6 (Sat)
      // We need to match what's in sections.days_of_week
      // Let's assume days_of_week stores strings like "Monday" or indices.
      // Typical structure in this codebase seems to be indices or full names.
      // Based on useSaveSchedule.js: lectureComponent?.days || []
      return c.dayOfWeek === dayOfWeek || c.dayOfWeek === DAYS_FULL[dayOfWeek]
    }).map(c => {
      // Inflate the recurring event with the actual date
      const eventDate = new Date(date)
      const [hours, minutes] = (c.start_at || '09:00').split(':').map(Number)
      eventDate.setHours(hours, minutes, 0)

      const endEventDate = new Date(date)
      const [endHours, endMinutes] = (c.end_at || '10:00').split(':').map(Number)
      endEventDate.setHours(endHours, endMinutes, 0)

      return {
        ...c,
        start_at: eventDate.toISOString(),
        end_at: endEventDate.toISOString()
      }
    })

    return [...staticEvents, ...classesForDay]
  }

  // Get events for current month
  const monthEvents = useMemo(() => {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

    return calendarEvents.filter((event) => {
      const eventDate = new Date(event.start_at)
      return eventDate >= monthStart && eventDate <= monthEnd
    })
  }, [calendarEvents, selectedDate])

  // Get events for current week
  const weekEvents = useMemo(() => {
    const startOfWeek = new Date(selectedDate)
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    return calendarEvents.filter((event) => {
      const eventDate = new Date(event.start_at)
      return eventDate >= startOfWeek && eventDate <= endOfWeek
    })
  }, [calendarEvents, selectedDate])

  // Get events for selected day
  const dayEvents = useMemo(() => {
    return getEventsForDate(selectedDate).sort((a, b) => {
      return new Date(a.start_at) - new Date(b.start_at)
    })
  }, [calendarEvents, selectedDate])

  // Get all events sorted by time (for schedule view)
  const scheduleEvents = useMemo(() => {
    return [...calendarEvents].sort((a, b) => {
      return new Date(a.start_at) - new Date(b.start_at)
    })
  }, [calendarEvents])

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(selectedDate.getMonth() + direction)
    setSelectedDate(newDate)
  }

  const navigateWeek = (direction) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + direction * 7)
    setSelectedDate(newDate)
  }

  const navigateDay = (direction) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + direction)
    setSelectedDate(newDate)
  }


  const renderMonthView = () => {
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const calendarDays = []
    // Add days from previous month
    const prevMonthLastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      calendarDays.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, prevMonthLastDay - i),
      })
    }
    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i),
      })
    }
    // Add days from next month to fill the grid
    const remainingDays = 42 - calendarDays.length
    for (let i = 1; i <= remainingDays; i++) {
      calendarDays.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, i),
      })
    }

    const today = new Date()
    const isToday = (date) => {
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      )
    }

    const isSelected = (date) => {
      return (
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()
      )
    }

    const selectedDayEvents = getEventsForDate(selectedDate)

    return (
      <ScrollView
        style={styles.monthContainer}
        contentContainerStyle={styles.monthContainerContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar Grid */}
        <View style={styles.monthGrid}>
          {DAYS_SHORT.map((day, index) => (
            <View key={`day-header-${index}`} style={styles.monthDayHeader}>
              <Text style={styles.monthDayHeaderText}>{day}</Text>
            </View>
          ))}
          {calendarDays.map(({ day, isCurrentMonth, date }, index) => {
            const dayEvents = getEventsForDate(date)
            const dayIsToday = isToday(date)
            const dayIsSelected = isSelected(date)

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.monthDayCell,
                  !isCurrentMonth && styles.monthDayCellOtherMonth,
                  dayIsSelected && styles.monthDayCellSelected,
                ]}
                onPress={() => setSelectedDate(date)}
                activeOpacity={0.7}
              >
                <View style={styles.monthDayNumberContainer}>
                  <Text
                    style={[
                      styles.monthDayNumber,
                      !isCurrentMonth && styles.monthDayNumberOtherMonth,
                      dayIsSelected && styles.monthDayNumberSelected,
                    ]}
                  >
                    {day}
                  </Text>
                  {/* Sticker for special days (holidays) */}
                  {(() => {
                    const holidaySticker = getDaySticker(date)
                    return holidaySticker ? (
                      <Text style={styles.monthDaySticker}>{holidaySticker}</Text>
                    ) : null
                  })()}
                  {/* Sticker from events/tasks on this day */}
                  {(() => {
                    const dayEvents = getEventsForDate(date)
                    const eventWithSticker = dayEvents.find(e => e.sticker)
                    return eventWithSticker ? (
                      <Text style={styles.monthDaySticker}>{eventWithSticker.sticker}</Text>
                    ) : null
                  })()}
                </View>
                {dayEvents.length > 0 && !dayIsSelected && (
                  <View style={styles.monthEventDots}>
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <View
                        key={i}
                        style={[
                          styles.monthEventDot,
                          { backgroundColor: getEventColorFromTheme(event, theme) },
                        ]}
                        onLongPress={() => handleDeleteEvent(event.id, event.title || 'Event')}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <Text style={styles.monthEventDotMore}>+{dayEvents.length - 3}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Events List for Selected Day */}
        <View style={styles.monthEventsList}>
          {selectedDayEvents.length > 0 ? (
            selectedDayEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.monthEventItem}
                onPress={() => router.push(`/events/${event.id}`)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.monthEventDotLarge,
                    { backgroundColor: getEventColor(event) },
                  ]}
                />
                <View style={styles.monthEventContent}>
                  <View style={styles.monthEventHeader}>
                    <Text style={styles.monthEventTitle}>{event.title}</Text>
                    <Text style={[styles.monthEventTypeBadge, { color: getEventColor(event) }]}>
                      {getEventTypeLabel(event)}
                    </Text>
                  </View>
                  <Text style={styles.monthEventTime}>
                    {formatDateShort(event.start_at)} {formatTime(event.start_at)}
                  </Text>
                  {event.location_name && (
                    <Text style={styles.monthEventLocation} numberOfLines={1}>
                      📍 {event.location_name}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noEventsContainer}>
              <Text style={styles.noEventsText}>No events for this day</Text>
            </View>
          )}
        </View>
      </ScrollView>
    )
  }

  const renderWeekView = () => {
    const startOfWeek = new Date(selectedDate)
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      weekDays.push(day)
    }

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const isSelected = (date) => {
      return (
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()
      )
    }

    return (
      <View style={styles.weekContainer}>
        {/* Week Header */}
        <View style={styles.weekHeader}>
          <View style={styles.weekHeaderTimeColumn} />
          {weekDays.map((day, index) => {
            const dayIsSelected = isSelected(day)
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.weekHeaderDay,
                  dayIsSelected && styles.weekHeaderDaySelected,
                ]}
                onPress={() => setSelectedDate(day)}
                activeOpacity={0.7}
              >
                <Text style={[styles.weekHeaderDayName, dayIsSelected && styles.weekHeaderDayNameSelected]}>
                  {DAYS_SHORT[day.getDay()]}
                </Text>
                <Text style={[styles.weekHeaderDayNumber, dayIsSelected && styles.weekHeaderDayNumberSelected]}>
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Week Timeline */}
        <ScrollView
          style={styles.weekTimeline}
          contentContainerStyle={styles.weekTimelineContent}
          showsVerticalScrollIndicator={false}
        >
          {hours.map((hour) => {
            const hourEvents = weekEvents.filter((event) => {
              const eventDate = new Date(event.start_at)
              return eventDate.getHours() === hour
            })

            return (
              <View key={hour} style={styles.weekHourRow}>
                <View style={styles.weekHourLabel}>
                  <Text style={styles.weekHourText}>
                    {hour === 0 ? '12' : hour <= 12 ? hour : hour - 12}
                    {hour < 12 ? ' AM' : ' PM'}
                  </Text>
                </View>
                <View style={styles.weekHourContent}>
                  {weekDays.map((day, dayIndex) => {
                    const dayEvents = hourEvents.filter((event) => {
                      const eventDate = new Date(event.start_at)
                      return (
                        eventDate.getDate() === day.getDate() &&
                        eventDate.getMonth() === day.getMonth() &&
                        eventDate.getFullYear() === day.getFullYear()
                      )
                    })

                    return (
                      <View key={dayIndex} style={styles.weekDayColumn}>
                        {dayEvents.map((event) => (
                          <TouchableOpacity
                            key={event.id}
                            style={[
                              styles.weekEventBlock,
                              { backgroundColor: getEventColorFromTheme(event, theme) },
                            ]}
                            onPress={() => router.push(`/events/${event.id}`)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.weekEventTitle} numberOfLines={1}>
                              {event.title}
                            </Text>
                            <Text style={styles.weekEventTime}>
                              {formatTime(event.start_at)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )
                  })}
                </View>
              </View>
            )
          })}
        </ScrollView>
      </View>
    )
  }

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <View style={styles.dayContainer}>
        {/* Day Header */}
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderDate}>
            {DAYS_FULL[selectedDate.getDay()]}, {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
          </Text>
        </View>

        {/* Day Timeline */}
        <ScrollView
          style={styles.dayTimeline}
          contentContainerStyle={styles.dayTimelineContent}
          showsVerticalScrollIndicator={false}
        >
          {hours.map((hour) => {
            const hourEvents = dayEvents.filter((event) => {
              const eventDate = new Date(event.start_at)
              return eventDate.getHours() === hour
            })

            return (
              <View key={hour} style={styles.dayHourRow}>
                <View style={styles.dayHourLabel}>
                  <Text style={styles.dayHourText}>
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </Text>
                </View>
                <View style={styles.dayHourContent}>
                  {hourEvents.map((event) => {
                    const isTask = event.type === 'task'
                    return (
                      <TouchableOpacity
                        key={event.id}
                        style={[
                          styles.dayEventItem,
                          isTask && styles.dayTaskItem,
                        ]}
                        onPress={() => router.push(`/events/${event.id}`)}
                        activeOpacity={0.7}
                      >
                        {isTask ? (
                          <View style={styles.taskCheckbox}>
                            <View style={[
                              styles.taskCheckboxInner,
                              event.completed && styles.taskCheckboxCompleted
                            ]}>
                              {event.completed && (
                                <Text style={styles.taskCheckmark}>✓</Text>
                              )}
                            </View>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.dayEventDot,
                              { backgroundColor: getEventColorFromTheme(event, theme) },
                            ]}
                          />
                        )}
                        <View style={styles.dayEventContent}>
                          <Text style={[
                            styles.dayEventTitle,
                            isTask && event.completed && styles.dayTaskTitleCompleted
                          ]}>
                            {event.title}
                          </Text>
                          <Text style={styles.dayEventTime}>
                            {formatTime(event.start_at)}
                          </Text>
                        </View>
                        {event.sticker && (
                          <Text style={styles.dayEventSticker}>{event.sticker}</Text>
                        )}
                      </TouchableOpacity>
                    )
                  })}
                  {hourEvents.length === 0 && <View style={styles.dayHourLine} />}
                </View>
              </View>
            )
          })}
        </ScrollView>
      </View>
    )
  }

  const renderScheduleView = () => {
    // Separate tasks and events
    const events = scheduleEvents.filter(e => e.type !== 'task')
    const tasks = scheduleEvents.filter(e => e.type === 'task')

    // Group events by date
    const eventsByDate = {}
    events.forEach(event => {
      const eventDate = new Date(event.start_at)
      const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = []
      }
      eventsByDate[dateKey].push(event)
    })

    return (
      <ScrollView
        style={styles.scheduleContainer}
        contentContainerStyle={styles.scheduleContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tasks Section (at top, like Google Calendar) */}
        {tasks.length > 0 && (
          <View style={styles.scheduleTasksSection}>
            <View style={styles.scheduleSectionHeader}>
              <Text style={styles.scheduleSectionTitle}>Tasks</Text>
              <Text style={styles.scheduleSectionCount}>{tasks.length}</Text>
            </View>
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.scheduleTaskItem}
                onPress={() => router.push(`/events/${task.id}`)}
                onLongPress={() => handleDeleteEvent(task.id, task.title || 'Task')}
                activeOpacity={0.7}
              >
                <View style={styles.taskCheckbox}>
                  <View style={[
                    styles.taskCheckboxInner,
                    task.completed && styles.taskCheckboxCompleted
                  ]}>
                    {task.completed && (
                      <Text style={styles.taskCheckmark}>✓</Text>
                    )}
                  </View>
                </View>
                <View style={styles.scheduleTaskContent}>
                  <Text style={[
                    styles.scheduleTaskTitle,
                    task.completed && styles.scheduleTaskTitleCompleted
                  ]}>
                    {task.title}
                  </Text>
                  {task.start_at && (
                    <Text style={styles.scheduleTaskTime}>
                      {formatDateShort(task.start_at)} • {formatTime(task.start_at)}
                    </Text>
                  )}
                </View>
                {task.sticker && (
                  <Text style={styles.scheduleTaskSticker}>{task.sticker}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Events Section (grouped by date) */}
        {Object.keys(eventsByDate).sort().map((dateKey) => {
          const [year, month, day] = dateKey.split('-').map(Number)
          const date = new Date(year, month, day)
          const dateEvents = eventsByDate[dateKey]

          return (
            <View key={dateKey} style={styles.scheduleDateSection}>
              <View style={styles.scheduleDateHeader}>
                <Text style={styles.scheduleDateTitle}>
                  {DAYS_FULL[date.getDay()]}, {MONTHS[date.getMonth()]} {date.getDate()}
                </Text>
                <Text style={styles.scheduleDateSubtitle}>
                  {dateEvents.length} {dateEvents.length === 1 ? 'event' : 'events'}
                </Text>
              </View>

              {dateEvents.map((event) => {
                const eventStart = new Date(event.start_at)
                const eventEnd = event.end_at ? new Date(event.end_at) : null
                const duration = eventEnd
                  ? Math.round((eventEnd - eventStart) / (1000 * 60)) // minutes
                  : 60 // default 1 hour

                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.scheduleEventItem,
                      { borderLeftColor: getEventColor(event) }
                    ]}
                    onPress={() => router.push(`/events/${event.id}`)}
                    onLongPress={() => handleDeleteEvent(event.id, event.title || 'Event')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.scheduleEventTimeColumn}>
                      <Text style={styles.scheduleEventTime}>
                        {formatTime(event.start_at)}
                      </Text>
                      {eventEnd && (
                        <Text style={styles.scheduleEventEndTime}>
                          {formatTime(eventEnd)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.scheduleEventContent}>
                      <View style={styles.scheduleEventHeader}>
                        <Text style={styles.scheduleEventTitle} numberOfLines={2}>
                          {event.title}
                        </Text>
                        {event.sticker && (
                          <Text style={styles.scheduleEventSticker}>{event.sticker}</Text>
                        )}
                      </View>
                      {event.location_name && (
                        <View style={styles.scheduleEventMeta}>
                          <MapPin size={hp(1.4)} color={theme.colors.textSecondary} />
                          <Text style={styles.scheduleEventLocation} numberOfLines={1}>
                            {event.location_name}
                          </Text>
                        </View>
                      )}
                      <View style={styles.scheduleEventFooter}>
                        <View style={[
                          styles.scheduleEventTypeBadge,
                          { backgroundColor: getEventColor(event) + '20' }
                        ]}>
                          <Text style={[
                            styles.scheduleEventTypeText,
                            { color: getEventColorFromTheme(event, theme) }
                          ]}>
                            {getEventTypeLabel(event)}
                          </Text>
                        </View>
                        {duration && (
                          <Text style={styles.scheduleEventDuration}>
                            {duration < 60 ? `${duration}m` : `${Math.round(duration / 60)}h`}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          )
        })}

        {scheduleEvents.length === 0 && (
          <View style={styles.scheduleEmptyState}>
            <Text style={styles.scheduleEmptyText}>No events or tasks</Text>
            <Text style={styles.scheduleEmptySubtext}>Tap the + button to create one</Text>
          </View>
        )}
      </ScrollView>
    )
  }

  const renderView = () => {
    switch (viewMode) {
      case 'week':
        return renderWeekView()
      case 'day':
        return renderDayView()
      case 'schedule':
        return renderScheduleView()
      case 'month':
      default:
        return renderMonthView()
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <AppTopBar
          schoolName={universityName}
          onPressProfile={() => router.push('/profile')}
          onPressSchool={() => { }}
          onPressNotifications={() => router.push('/notifications')}
        />

        {/* Unified Calendar Controls - Compact */}
        <View style={styles.unifiedControlsContainer}>
          {/* View Mode Selector Row */}
          <View style={styles.viewModeRow}>
            <Chip
              label="Month"
              active={viewMode === 'month'}
              onPress={() => setViewMode('month')}
              style={styles.viewModeChip}
            />
            <Chip
              label="Week"
              active={viewMode === 'week'}
              onPress={() => setViewMode('week')}
              style={styles.viewModeChip}
            />
            <Chip
              label="Day"
              active={viewMode === 'day'}
              onPress={() => setViewMode('day')}
              style={styles.viewModeChip}
            />
            <Chip
              label="Schedule"
              active={viewMode === 'schedule'}
              onPress={() => setViewMode('schedule')}
              style={styles.viewModeChip}
            />
          </View>

          {/* Event Type Tabs - Messages Style */}
          <View style={styles.eventTypeTabContainer}>
            <TouchableOpacity
              style={[
                styles.eventTypeTab,
                eventTypeFilter === 'all' && styles.eventTypeTabActive,
              ]}
              onPress={() => setEventTypeFilter('all')}
            >
              <Text
                style={[
                  styles.eventTypeTabText,
                  eventTypeFilter === 'all' && styles.eventTypeTabTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.eventTypeTab,
                eventTypeFilter === 'events' && styles.eventTypeTabActive,
              ]}
              onPress={() => setEventTypeFilter('events')}
            >
              <Text
                style={[
                  styles.eventTypeTabText,
                  eventTypeFilter === 'events' && styles.eventTypeTabTextActive,
                ]}
              >
                Events
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.eventTypeTab,
                eventTypeFilter === 'tasks' && styles.eventTypeTabActive,
              ]}
              onPress={() => setEventTypeFilter('tasks')}
            >
              <Text
                style={[
                  styles.eventTypeTabText,
                  eventTypeFilter === 'tasks' && styles.eventTypeTabTextActive,
                ]}
              >
                Tasks
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.eventTypeTab,
                eventTypeFilter === 'classes' && styles.eventTypeTabActive,
              ]}
              onPress={() => setEventTypeFilter('classes')}
            >
              <Text
                style={[
                  styles.eventTypeTabText,
                  eventTypeFilter === 'classes' && styles.eventTypeTabTextActive,
                ]}
              >
                Classes
              </Text>
            </TouchableOpacity>
          </View>

          {/* Month Navigation (only for month view) - Integrated */}
          {viewMode === 'month' && (
            <View style={styles.monthNavigationCompact}>
              <TouchableOpacity
                onPress={() => navigateMonth(-1)}
                style={styles.navButton}
                activeOpacity={0.7}
              >
                <ChevronLeft size={hp(1.8)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
              <TouchableOpacity
                onPress={() => navigateMonth(1)}
                style={styles.navButton}
                activeOpacity={0.7}
              >
                <ChevronRight size={hp(1.8)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Week Navigation (only for week view) - Integrated */}
          {viewMode === 'week' && (
            <View style={styles.weekNavigationCompact}>
              <TouchableOpacity
                onPress={() => navigateWeek(-1)}
                style={styles.navButton}
                activeOpacity={0.7}
              >
                <ChevronLeft size={hp(1.8)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.weekTitle}>
                {(() => {
                  const startOfWeek = new Date(selectedDate)
                  startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
                  const endOfWeek = new Date(startOfWeek)
                  endOfWeek.setDate(startOfWeek.getDate() + 6)
                  return `${MONTHS[startOfWeek.getMonth()].substring(0, 3)} ${startOfWeek.getDate()} - ${MONTHS[endOfWeek.getMonth()].substring(0, 3)} ${endOfWeek.getDate()}`
                })()}
              </Text>
              <TouchableOpacity
                onPress={() => navigateWeek(1)}
                style={styles.navButton}
                activeOpacity={0.7}
              >
                <ChevronRight size={hp(1.8)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Day Navigation (only for day view) - Integrated */}
          {viewMode === 'day' && (
            <View style={styles.dayNavigationCompact}>
              <TouchableOpacity
                onPress={() => navigateDay(-1)}
                style={styles.navButton}
                activeOpacity={0.7}
              >
                <ChevronLeft size={hp(1.8)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.dayTitle}>
                {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
              </Text>
              <TouchableOpacity
                onPress={() => navigateDay(1)}
                style={styles.navButton}
                activeOpacity={0.7}
              >
                <ChevronRight size={hp(1.8)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Calendar View */}
        {renderView()}

        {/* Create Event FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateEventModal(true)}
          activeOpacity={0.8}
        >
          <Plus size={hp(3.5)} color={theme.colors.white} strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Create Calendar Event Modal */}
        {showCreateEventModal && (
          <CreateCalendarEventModal
            visible={showCreateEventModal}
            onClose={() => setShowCreateEventModal(false)}
            selectedDate={selectedDate}
            userOrgs={userOrgs}
            onEventCreated={() => {
              setShowCreateEventModal(false)
            }}
          />
        )}

        <BottomNav />
      </View>
    </SafeAreaView>
  )
}

// Create Calendar Event Modal Component
function CreateCalendarEventModal({ visible, onClose, selectedDate, userOrgs, onEventCreated }) {
  const router = useRouter()
  const theme = useAppTheme()
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState(selectedDate || new Date())
  const [startTime, setStartTime] = useState(new Date())
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(new Date().getHours() + 1)))
  const [location, setLocation] = useState('')
  const [locationCoords, setLocationCoords] = useState(null) // { lat, lng }
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)
  const [showInviteesModal, setShowInviteesModal] = useState(false)
  const [showVisibilityModal, setShowVisibilityModal] = useState(false)
  const [selectedInvitees, setSelectedInvitees] = useState([])
  const [visibility, setVisibility] = useState('personal') // Changed default to personal
  const [isMandatory, setIsMandatory] = useState(false)
  const [eventType, setEventType] = useState('personal') // 'personal', 'org'
  const [itemType, setItemType] = useState('event') // 'event' or 'task'
  const [customColor, setCustomColor] = useState(null) // Custom RGB color
  const [recurringFrequency, setRecurringFrequency] = useState('weekly') // 'weekly', 'biweekly'
  const [recurringEndDate, setRecurringEndDate] = useState(null)
  const [recurringDays, setRecurringDays] = useState([]) // ['monday', 'tuesday', etc.]
  const [showRecurringEndDatePicker, setShowRecurringEndDatePicker] = useState(false)
  const [selectedSticker, setSelectedSticker] = useState(null) // Emoji sticker
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const styles = createStyles(theme)
  const { user } = useAuthStore()
  const { data: userProfile } = useCurrentUserProfile()
  const { getAdminClubs } = useClubsContext()
  const { data: friends } = useFriends()
  const createEventMutation = useCreateEvent()
  const deleteEventMutation = useDeleteEvent()
  const { showDelete, showSuccess, showError, AlertComponent } = useCustomAlert()

  const adminClubs = getAdminClubs()
  const [selectedOrgId, setSelectedOrgId] = useState(null)

  // Initialize selectedOrgId when userOrgs loads
  useEffect(() => {
    if (userOrgs && userOrgs.length > 0 && !selectedOrgId) {
      setSelectedOrgId(userOrgs[0].id)
    }
  }, [userOrgs])

  // Handle event deletion
  const handleDeleteEvent = (eventId, eventTitle) => {
    showDelete(
      `Delete ${eventTitle.includes('Task') ? 'Task' : 'Event'}`,
      `Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`,
      () => {
        deleteEventMutation.mutateAsync(eventId)
      }
    )
  }


  const handleCreate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (isCreating) return
    // Check onboarding completion
    if (!userProfile?.onboarding_complete) {
      Alert.alert(
        'Complete Your Profile',
        `Please complete your onboarding to create events. You're ${userProfile?.profile_completion_percentage || 0}% done!`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Complete Now', onPress: () => router.push('/onboarding') },
        ]
      )
      return
    }

    if (!title.trim()) {
      Alert.alert('Required', 'Please enter an event title')
      return
    }

    // Validate admin permissions for org events
    if (eventType === 'org' && userOrgs.length === 0) {
      Alert.alert('Access Denied', 'Only organization admins can create organization events')
      return
    }

    if (eventType === 'org' && !selectedOrgId) {
      Alert.alert('Required', 'Please select an organization for this event')
      return
    }

    // Create event object with all fields including sticker
    const newEvent = {
      title: title.trim(),
      type: itemType, // 'event' or 'task'
      start_at: new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate(),
        startTime.getHours(),
        startTime.getMinutes()
      ).toISOString(),
      end_at: new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate(),
        endTime.getHours(),
        endTime.getMinutes()
      ).toISOString(),
      location_name: location || null,
      location_coords: locationCoords,
      color: customColor || getEventColorFromTheme({ type: itemType, visibility: eventType === 'personal' ? 'invite_only' : eventType === 'social' ? 'public' : 'org_only' }, theme),
      visibility: eventType === 'personal' ? 'invite_only' : eventType === 'social' ? 'public' : 'org_only',
      sticker: selectedSticker || null,
      is_recurring: isRecurring,
      recurring_frequency: isRecurring ? recurringFrequency : null,
      recurring_days: isRecurring ? recurringDays : [],
      recurring_end_date: isRecurring && recurringEndDate ? recurringEndDate.toISOString() : null,
    }

    // Create event in database
    try {
      setIsCreating(true)
      console.log('Creating event:', newEvent)

      // Map to database schema
      const eventData = {
        organizer_id: eventType === 'org' ? selectedOrgId : user.id,
        organizer_type: eventType === 'org' ? 'org' : 'user',
        title: newEvent.title,
        description: null,
        start_at: newEvent.start_at,
        end_at: newEvent.end_at,
        location_name: newEvent.location_name,
        location_address: newEvent.location_name,
        visibility: newEvent.visibility,
        org_id: eventType === 'org' ? selectedOrgId : null,
        type: eventType, // 'personal', 'social', 'org', 'event', 'task'
        university_id: userProfile?.university_id,
        ticket_types: [],
        invites: selectedInvitees.map(id => ({ user_id: id })),
        sticker: selectedSticker || null,
        is_recurring: isRecurring,
        recurring_frequency: isRecurring ? recurringFrequency : null,
        recurring_days: isRecurring ? recurringDays : [],
        recurring_end_date: isRecurring && recurringEndDate ? recurringEndDate.toISOString() : null,
      }

      console.log('Creating event with data:', eventData)
      await createEventMutation.mutateAsync(eventData)

      showSuccess('Success!', 'Event created successfully!')
      onEventCreated()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onClose()
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      console.error('Error creating event:', error)
      showError('Error', getFriendlyErrorMessage(error, 'Failed to create event. Please try again.'))
    } finally {
      setIsCreating(false)
    }
  }

  const toggleInvitee = (id) => {
    setSelectedInvitees((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.createEventModalContent}>
          <View style={styles.createEventModalHeader}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.createEventModalTitle}>New Event</Text>
            <TouchableOpacity
              onPress={handleCreate}
              activeOpacity={0.7}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text style={[styles.modalCancelText, styles.modalCreateText]}>Create</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.createEventModalBody} showsVerticalScrollIndicator={false}>
            {/* Event or Task Selection */}
            <View style={styles.createEventField}>
              <Text style={styles.createEventLabel}>Type</Text>
              <View style={styles.eventTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.eventTypeOption,
                    itemType === 'event' && styles.eventTypeOptionActive,
                  ]}
                  onPress={() => setItemType('event')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.eventTypeOptionText,
                      itemType === 'event' && styles.eventTypeOptionTextActive,
                    ]}
                  >
                    Event
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.eventTypeOption,
                    itemType === 'task' && styles.eventTypeOptionActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setItemType('task')
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.eventTypeOptionText,
                      itemType === 'task' && styles.eventTypeOptionTextActive,
                    ]}
                  >
                    Task
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Event Type Selection (only for events) */}
            {itemType === 'event' && (
              <View style={styles.createEventField}>
                <Text style={styles.createEventLabel}>Event Type</Text>
                <View style={styles.eventTypeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.eventTypeOption,
                      eventType === 'personal' && styles.eventTypeOptionActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setEventType('personal')
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.eventTypeOptionText,
                        eventType === 'personal' && styles.eventTypeOptionTextActive,
                      ]}
                    >
                      Personal
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.eventTypeOption,
                      eventType === 'social' && styles.eventTypeOptionActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setEventType('social')
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.eventTypeOptionText,
                        eventType === 'social' && styles.eventTypeOptionTextActive,
                      ]}
                    >
                      Social
                    </Text>
                  </TouchableOpacity>
                  {/* Only show Org Event option for admins */}
                  {userOrgs.length > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.eventTypeOption,
                        eventType === 'org' && styles.eventTypeOptionActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        setEventType('org')
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.eventTypeOptionText,
                          eventType === 'org' && styles.eventTypeOptionTextActive,
                        ]}
                      >
                        Org Event
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Color Picker */}
            <View style={styles.createEventField}>
              <ColorPicker
                value={customColor || getEventColorFromTheme({ type: itemType, visibility: eventType === 'personal' ? 'invite_only' : 'org_only' }, theme)}
                onChange={setCustomColor}
                label="Color"
              />
            </View>

            {/* Title */}
            <View style={styles.createEventField}>
              <Text style={styles.createEventLabel}>Title</Text>
              <TextInput
                style={styles.createEventInput}
                placeholder="Event name"
                placeholderTextColor={theme.colors.textSecondary}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>

            {/* Date */}
            <View style={styles.createEventField}>
              <Text style={styles.createEventLabel}>Date</Text>
              <TouchableOpacity
                style={styles.createEventSelectField}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setShowDatePicker(true)
                }}
                activeOpacity={0.7}
              >
                <CalendarIcon size={hp(2)} color={theme.colors.textSecondary} />
                <Text style={styles.createEventSelectText}>{formatDate(eventDate)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowDatePicker(false)
                    if (date) setEventDate(date)
                  }}
                  textColor={theme.colors.textPrimary}
                />
              )}
            </View>

            {/* Time */}
            <View style={styles.createEventField}>
              <Text style={styles.createEventLabel}>Time</Text>
              <View style={styles.timeRow}>
                <TouchableOpacity
                  style={styles.createEventSelectField}
                  onPress={() => setShowStartTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeIcon}>🕐</Text>
                  <Text style={styles.createEventSelectText}>{formatTime(startTime)}</Text>
                </TouchableOpacity>
                <ChevronRight size={hp(2)} color={theme.colors.textSecondary} />
                <TouchableOpacity
                  style={styles.createEventSelectField}
                  onPress={() => setShowEndTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeIcon}>🕐</Text>
                  <Text style={styles.createEventSelectText}>{formatTime(endTime)}</Text>
                </TouchableOpacity>
              </View>
              {showStartTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowStartTimePicker(false)
                    if (date) setStartTime(date)
                  }}
                  textColor={theme.colors.textPrimary}
                />
              )}
              {showEndTimePicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowEndTimePicker(false)
                    if (date) setEndTime(date)
                  }}
                  textColor={theme.colors.textPrimary}
                />
              )}
            </View>

            <View style={styles.createEventField}>
              <Text style={styles.createEventLabel}>Location (Optional)</Text>
              <View style={styles.createEventSelectField}>
                <MapPin size={hp(2)} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.createEventSelectText, { flex: 1, paddingVertical: 0 }]}
                  placeholder="Enter location"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            {/* Recurring */}
            <View style={styles.createEventField}>
              <View style={styles.switchRow}>
                <Text style={styles.createEventLabel}>Recurring</Text>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: theme.colors.offWhite, true: theme.colors.bondedPurple }}
                  thumbColor={theme.colors.white}
                />
              </View>

              {/* Recurring Options - Always visible */}
              <View style={styles.recurringOptions}>
                {/* Frequency */}
                <View style={styles.recurringOptionRow}>
                  <Text style={styles.recurringOptionLabel}>Frequency</Text>
                  <View style={styles.recurringFrequencySelector}>
                    <TouchableOpacity
                      style={[
                        styles.recurringFrequencyOption,
                        recurringFrequency === 'weekly' && styles.recurringFrequencyOptionActive,
                      ]}
                      onPress={() => setRecurringFrequency('weekly')}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.recurringFrequencyOptionText,
                          recurringFrequency === 'weekly' && styles.recurringFrequencyOptionTextActive,
                        ]}
                      >
                        Weekly
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.recurringFrequencyOption,
                        recurringFrequency === 'biweekly' && styles.recurringFrequencyOptionActive,
                      ]}
                      onPress={() => setRecurringFrequency('biweekly')}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.recurringFrequencyOptionText,
                          recurringFrequency === 'biweekly' && styles.recurringFrequencyOptionTextActive,
                        ]}
                      >
                        Bi-weekly
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Days of Week */}
                <View style={styles.recurringOptionRow}>
                  <Text style={styles.recurringOptionLabel}>Repeat on</Text>
                  <View style={styles.recurringDaysSelector}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                      const dayLower = day.toLowerCase()
                      const isSelected = recurringDays.includes(dayLower)
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.recurringDayChip,
                            isSelected && styles.recurringDayChipActive,
                          ]}
                          onPress={() => {
                            setRecurringDays((prev) =>
                              isSelected
                                ? prev.filter((d) => d !== dayLower)
                                : [...prev, dayLower]
                            )
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.recurringDayChipText,
                              isSelected && styles.recurringDayChipTextActive,
                            ]}
                          >
                            {day.substring(0, 3)}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>

                {/* End Date */}
                <View style={styles.recurringOptionRow}>
                  <Text style={styles.recurringOptionLabel}>Ends</Text>
                  <TouchableOpacity
                    style={styles.recurringEndDateButton}
                    onPress={() => setShowRecurringEndDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.recurringEndDateText}>
                      {recurringEndDate
                        ? formatDate(recurringEndDate)
                        : 'Never'}
                    </Text>
                    <ChevronRight size={hp(1.8)} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Sticker Picker */}
            <View style={styles.createEventField}>
              <Text style={styles.createEventLabel}>Sticker (Optional)</Text>
              <TouchableOpacity
                style={styles.createEventSelectField}
                onPress={() => setShowStickerPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.stickerIcon}>
                  {selectedSticker || '😊'}
                </Text>
                <Text
                  style={[
                    styles.createEventSelectText,
                    !selectedSticker && { color: theme.colors.textSecondary },
                  ]}
                >
                  {selectedSticker ? `Selected: ${selectedSticker}` : 'Select Sticker'}
                </Text>
                {selectedSticker && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation()
                      setSelectedSticker(null)
                    }}
                    activeOpacity={0.7}
                    style={styles.removeStickerButton}
                  >
                    <Text style={styles.removeStickerButtonText}>×</Text>
                  </TouchableOpacity>
                )}
                <ChevronRight size={hp(1.8)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Invitees - Only show for personal events */}
            {eventType === 'personal' && (
              <View style={styles.createEventField}>
                <Text style={styles.createEventLabel}>Invite People (Optional)</Text>
                <TouchableOpacity
                  style={styles.createEventSelectField}
                  onPress={() => setShowInviteesModal(true)}
                  activeOpacity={0.7}
                >
                  <Users size={hp(2)} color={theme.colors.textSecondary} />
                  <Text style={styles.createEventSelectText}>
                    {selectedInvitees.length === 0 ? 'Add people' : `${selectedInvitees.length} people`}
                  </Text>
                  <ChevronDown size={hp(2)} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Org Selection - Only for org events */}
            {eventType === 'org' && userOrgs.length > 0 && (
              <View style={styles.createEventField}>
                <Text style={styles.createEventLabel}>Organization</Text>
                <TouchableOpacity
                  style={styles.createEventSelectField}
                  onPress={() => setShowVisibilityModal(true)}
                  activeOpacity={0.7}
                >
                  <Users size={hp(2)} color={theme.colors.textSecondary} />
                  <Text style={styles.createEventSelectText}>
                    {userOrgs.find(o => o.isAdmin)?.name || 'Select org'}
                  </Text>
                  <ChevronDown size={hp(2)} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.createEventHint}>
                  This event will appear on all org members' calendars
                </Text>
              </View>
            )}

          </ScrollView>

          {/* Date/Time Pickers */}
          {Platform.OS === 'ios' ? (
            <>
              {showDatePicker && (
                <Modal
                  visible={showDatePicker}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowDatePicker(false)}
                >
                  <View style={styles.pickerModalOverlay}>
                    <View style={styles.pickerModalContent}>
                      <View style={styles.pickerModalHeader}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={styles.pickerModalButton}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.pickerModalTitle}>Select Date</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setShowDatePicker(false)
                          }}
                        >
                          <Text style={[styles.pickerModalButton, styles.pickerModalButtonDone]}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={eventDate}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (event.type === 'set' && selectedDate) {
                            setEventDate(selectedDate)
                          }
                          if (event.type === 'dismissed') {
                            setShowDatePicker(false)
                          }
                        }}
                        minimumDate={new Date()}
                        textColor={theme.colors.textPrimary}
                        themeVariant={theme.mode}
                      />
                    </View>
                  </View>
                </Modal>
              )}
              {showStartTimePicker && (
                <Modal
                  visible={showStartTimePicker}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowStartTimePicker(false)}
                >
                  <View style={styles.pickerModalOverlay}>
                    <View style={styles.pickerModalContent}>
                      <View style={styles.pickerModalHeader}>
                        <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                          <Text style={styles.pickerModalButton}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.pickerModalTitle}>Start Time</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setShowStartTimePicker(false)
                          }}
                        >
                          <Text style={[styles.pickerModalButton, styles.pickerModalButtonDone]}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={startTime}
                        mode="time"
                        display="spinner"
                        onChange={(event, selectedTime) => {
                          if (event.type === 'set' && selectedTime) {
                            setStartTime(selectedTime)
                          }
                          if (event.type === 'dismissed') {
                            setShowStartTimePicker(false)
                          }
                        }}
                        textColor={theme.colors.textPrimary}
                        themeVariant={theme.mode}
                      />
                    </View>
                  </View>
                </Modal>
              )}
              {showEndTimePicker && (
                <Modal
                  visible={showEndTimePicker}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowEndTimePicker(false)}
                >
                  <View style={styles.pickerModalOverlay}>
                    <View style={styles.pickerModalContent}>
                      <View style={styles.pickerModalHeader}>
                        <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                          <Text style={styles.pickerModalButton}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.pickerModalTitle}>End Time</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setShowEndTimePicker(false)
                          }}
                        >
                          <Text style={[styles.pickerModalButton, styles.pickerModalButtonDone]}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={endTime}
                        mode="time"
                        display="spinner"
                        onChange={(event, selectedTime) => {
                          if (event.type === 'set' && selectedTime) {
                            setEndTime(selectedTime)
                          }
                          if (event.type === 'dismissed') {
                            setShowEndTimePicker(false)
                          }
                        }}
                        textColor={theme.colors.textPrimary}
                        themeVariant={theme.mode}
                      />
                    </View>
                  </View>
                </Modal>
              )}
            </>
          ) : (
            // Android pickers
            <>
              {showDatePicker && (
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false)
                    if (event.type === 'set' && selectedDate) {
                      setEventDate(selectedDate)
                    }
                  }}
                  minimumDate={new Date()}
                  textColor={theme.colors.textPrimary}
                  themeVariant={theme.mode}
                />
              )}
              {showStartTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowStartTimePicker(false)
                    if (event.type === 'set' && selectedTime) {
                      setStartTime(selectedTime)
                    }
                  }}
                  textColor={theme.colors.textPrimary}
                  themeVariant={theme.mode}
                />
              )}
              {showEndTimePicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowEndTimePicker(false)
                    if (event.type === 'set' && selectedTime) {
                      setEndTime(selectedTime)
                    }
                  }}
                  textColor={theme.colors.textPrimary}
                  themeVariant={theme.mode}
                />
              )}
            </>
          )}

          {/* Recurring End Date Picker Modal */}
          {showRecurringEndDatePicker && (
            <Modal
              visible={showRecurringEndDatePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowRecurringEndDatePicker(false)}
            >
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalContent}>
                  <View style={styles.pickerModalHeader}>
                    <TouchableOpacity onPress={() => setShowRecurringEndDatePicker(false)}>
                      <Text style={styles.pickerModalButton}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerModalTitle}>End Date</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowRecurringEndDatePicker(false)
                      }}
                    >
                      <Text style={[styles.pickerModalButton, styles.pickerModalButtonDone]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={recurringEndDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (event.type === 'set' && selectedDate) {
                        setRecurringEndDate(selectedDate)
                      }
                      if (event.type === 'dismissed') {
                        setShowRecurringEndDatePicker(false)
                      }
                    }}
                    minimumDate={new Date()}
                    textColor={theme.colors.textPrimary}
                    themeVariant={theme.mode}
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* Invitees Modal */}
          <Modal
            visible={showInviteesModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowInviteesModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Invite People</Text>
                  <TouchableOpacity onPress={() => setShowInviteesModal(false)}>
                    <Text style={styles.modalCloseText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  {/* All Members Option */}
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      selectedInvitees.length === 0 && styles.optionRowSelected,
                    ]}
                    onPress={() => setSelectedInvitees([])}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionText}>All members</Text>
                    {selectedInvitees.length === 0 && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>

                  {/* Individual Connections - Friends */}
                  {(friends || []).map((friend) => (
                    <TouchableOpacity
                      key={friend.id}
                      style={[
                        styles.inviteeRow,
                        selectedInvitees.includes(friend.id) && styles.inviteeRowSelected,
                      ]}
                      onPress={() => toggleInvitee(friend.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.inviteeLeft}>
                        {friend.avatar_url ? (
                          <Image source={{ uri: friend.avatar_url }} style={styles.inviteeAvatarImage} />
                        ) : (
                          <View style={styles.inviteeAvatar}>
                            <Text style={styles.inviteeAvatarText}>
                              {friend.full_name?.charAt(0) || friend.username?.charAt(0) || '?'}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.inviteeName}>{friend.full_name || friend.username}</Text>
                      </View>
                      {selectedInvitees.includes(friend.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Sticker Picker Modal */}
          <Modal
            visible={showStickerPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowStickerPicker(false)}
          >
            <View style={styles.pickerModalOverlay}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity onPress={() => setShowStickerPicker(false)}>
                    <Text style={styles.pickerModalButton}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Select Sticker</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowStickerPicker(false)
                    }}
                  >
                    <Text style={[styles.pickerModalButton, styles.pickerModalButtonDone]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.pickerModalBody} contentContainerStyle={styles.stickerPickerGrid}>
                  {[
                    '⭐', '🎉', '🎊', '🎈', '🎁', '🎂', '🎃', '🎄', '🎅', '🦃',
                    '❤️', '💯', '🔥', '✨', '🌟', '💪', '🎯', '🏆', '🎨', '🎵',
                    '📚', '✏️', '📝', '📅', '⏰', '🏠', '🚗', '✈️', '🏖️', '🍕',
                    '☕', '🍔', '🍰', '🎮', '⚽', '🏀', '🎾', '🏃', '🧘', '💼',
                    '🎓', '🎤', '🎬', '📸', '🎪', '🎭', '🖼️', '🎹', '🎸', '🎺',
                    '🏋️', '🚴', '🏊', '🧗', '⛷️', '🏄', '🌊', '🌴', '🌵', '🌺',
                    '🌸', '🌻', '🌷', '🌹', '🌿', '🍀', '🌱', '🌲', '🌳', '🌰',
                    '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑',
                    '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒',
                    '🥬', '🥦', '🥯', '🥐', '🥨', '🥞', '🧇', '🥓', '🥩', '🍗',
                  ].map((sticker, index) => (
                    <TouchableOpacity
                      key={`sticker-${index}-${sticker}`}
                      style={[
                        styles.stickerOption,
                        selectedSticker === sticker && styles.stickerOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedSticker(selectedSticker === sticker ? null : sticker)
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.stickerEmoji}>{sticker}</Text>
                      {selectedSticker === sticker && (
                        <View style={styles.stickerCheckmark}>
                          <Text style={styles.stickerCheckmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Visibility Modal */}
          <Modal
            visible={showVisibilityModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowVisibilityModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Visibility</Text>
                  <TouchableOpacity onPress={() => setShowVisibilityModal(false)}>
                    <Text style={styles.modalCloseText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  {userOrgs.map((org) => (
                    <TouchableOpacity
                      key={org.id}
                      style={[
                        styles.optionRow,
                        selectedOrgId === org.id && styles.optionRowSelected,
                      ]}
                      onPress={() => {
                        setSelectedOrgId(org.id)
                        setShowVisibilityModal(false)
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.optionText}>{org.name}</Text>
                      {selectedOrgId === org.id && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      visibility === 'org_members_only' && styles.optionRowSelected,
                    ]}
                    onPress={() => {
                      setVisibility('org_members_only')
                      setShowVisibilityModal(false)
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionText}>Org members only</Text>
                    {visibility === 'org_members_only' && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      visibility === 'public' && styles.optionRowSelected,
                    ]}
                    onPress={() => {
                      setVisibility('public')
                      setShowVisibilityModal(false)
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionText}>Public</Text>
                    {visibility === 'public' && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
        <AlertComponent />
      </View>
    </Modal>
  )
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  unifiedControlsContainer: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.xs,
  },
  viewModeRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  viewModeChip: {
    flex: 1,
  },
  // Event Type Tabs - Messages Style
  eventTypeTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(0.5),
    gap: wp(6),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  eventTypeTab: {
    paddingBottom: hp(1),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  eventTypeTabActive: {
    borderBottomColor: theme.colors.accent,
  },
  eventTypeTabText: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  eventTypeTabTextActive: {
    color: theme.colors.textPrimary,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  monthNavigationCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  navButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  monthTitle: {
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  weekNavigationCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  weekTitle: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  dayNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    backgroundColor: theme.colors.background,
  },
  dayNavigationCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  dayTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  fab: {
    position: 'absolute',
    bottom: hp(12),
    right: wp(5),
    width: hp(7),
    height: hp(7),
    borderRadius: hp(3.5),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 100,
  },
  // Month View Styles - Modern iOS Design
  monthContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  monthContainerContent: {
    paddingBottom: hp(20), // Extra padding to scroll past bottom nav
    flexGrow: 1,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: wp(3),
    paddingTop: hp(1.5),
    paddingBottom: hp(1),
  },
  monthDayHeader: {
    width: '14.28%',
    paddingVertical: hp(1.2),
    alignItems: 'center',
  },
  monthDayHeaderText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.2,
  },
  monthDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.5),
    marginVertical: hp(0.2),
  },
  monthDayCellOtherMonth: {
    opacity: 0.25,
  },
  monthDayCellSelected: {
    backgroundColor: theme.eventColors.campus,
    borderRadius: hp(2.2),
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  monthDayNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.5),
  },
  monthDayNumber: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '400',
    color: theme.colors.textPrimary,
  },
  monthDayNumberOtherMonth: {
    color: theme.colors.textSecondary,
    fontWeight: '300',
  },
  monthDayNumberSelected: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  monthDaySticker: {
    fontSize: hp(1.4),
  },
  monthEventDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(0.6),
    gap: wp(0.6),
    width: '100%',
    paddingHorizontal: wp(1),
  },
  monthEventDot: {
    width: wp(1.2),
    height: wp(1.2),
    borderRadius: wp(0.6),
  },
  monthEventDotMore: {
    fontSize: hp(0.9),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
    marginLeft: wp(0.2),
  },
  monthEventsList: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2.5),
    paddingBottom: hp(20), // Extra padding to scroll past bottom nav
    minHeight: hp(20),
  },
  monthEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: wp(3.5),
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  monthEventDotLarge: {
    width: hp(0.8),
    height: hp(0.8),
    borderRadius: hp(0.4),
    marginRight: wp(2.5),
  },
  monthEventContent: {
    flex: 1,
  },
  monthEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.3),
  },
  monthEventTitle: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
    letterSpacing: -0.2,
  },
  monthEventTypeBadge: {
    fontSize: hp(1.1),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    marginLeft: wp(2),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  monthEventTime: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontWeight: '400',
    marginBottom: hp(0.2),
  },
  monthEventLocation: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  noEventsContainer: {
    paddingVertical: hp(4),
    alignItems: 'center',
  },
  noEventsText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  // Week View Styles - Modern iOS Design
  weekContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  weekHeaderTimeColumn: {
    width: wp(15),
    borderRightWidth: 1.5,
    borderRightColor: theme.colors.border,
    backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
  },
  weekHeaderDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: hp(1.2),
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  weekHeaderDaySelected: {
    backgroundColor: theme.eventColors.campus,
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
    }),
  },
  weekHeaderDayName: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: hp(0.4),
    letterSpacing: 0.2,
  },
  weekHeaderDayNameSelected: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  weekHeaderDayNumber: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  weekHeaderDayNumberSelected: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  weekTimeline: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  weekTimelineContent: {
    paddingBottom: hp(20), // Extra padding to scroll past bottom nav
  },
  weekHourRow: {
    flexDirection: 'row',
    minHeight: hp(6),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  weekHourLabel: {
    width: wp(15),
    paddingTop: hp(0.8),
    paddingHorizontal: wp(2.5),
    borderRightWidth: 1.5,
    borderRightColor: theme.colors.border,
    justifyContent: 'flex-start',
    backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
  },
  weekHourText: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  weekHourContent: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
  },
  weekDayColumn: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.colors.border,
    padding: wp(0.8),
  },
  weekEventBlock: {
    padding: wp(2.5),
    borderRadius: theme.radius.md,
    marginBottom: hp(0.5),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  weekEventTitle: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: hp(0.2),
    letterSpacing: -0.2,
  },
  weekEventTime: {
    fontSize: hp(1.2),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.white,
    opacity: 0.85,
    fontWeight: '400',
  },
  // Day View Styles - Modern iOS Design
  dayContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dayHeader: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2.5),
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  dayHeaderDate: {
    fontSize: hp(2.8),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  dayTimeline: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dayTimelineContent: {
    paddingBottom: hp(20), // Extra padding to scroll past bottom nav
  },
  dayHourRow: {
    flexDirection: 'row',
    minHeight: hp(6),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dayHourLabel: {
    width: wp(15),
    paddingTop: hp(0.8),
    paddingHorizontal: wp(4),
    borderRightWidth: 1.5,
    borderRightColor: theme.colors.border,
    justifyContent: 'flex-start',
    backgroundColor: theme.colors.backgroundSecondary,
  },
  dayHourText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  dayHourContent: {
    flex: 1,
    padding: wp(3),
    backgroundColor: theme.colors.background,
  },
  dayHourLine: {
    height: 1.5,
    backgroundColor: theme.colors.border,
    marginTop: hp(0.5),
  },
  dayEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: wp(3.5),
    marginBottom: hp(1),
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  dayEventDot: {
    width: hp(0.8),
    height: hp(0.8),
    borderRadius: hp(0.4),
    marginRight: wp(2.5),
  },
  dayEventContent: {
    flex: 1,
  },
  dayEventTitle: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.3),
    letterSpacing: -0.2,
  },
  dayEventTime: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  dayTaskItem: {
    borderLeftWidth: 0,
  },
  dayTaskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  dayEventSticker: {
    fontSize: hp(2),
    marginLeft: wp(2),
  },
  taskCheckbox: {
    width: hp(2.5),
    height: hp(2.5),
    marginRight: wp(2.5),
  },
  taskCheckboxInner: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: theme.colors.bondedPurple,
    borderColor: theme.colors.bondedPurple,
  },
  taskCheckmark: {
    fontSize: hp(1.5),
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  // Schedule View Styles - Google Calendar Style
  scheduleContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scheduleContent: {
    paddingBottom: hp(20),
  },
  scheduleTasksSection: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(1),
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.border,
    marginBottom: hp(2),
  },
  scheduleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  scheduleSectionTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  scheduleSectionCount: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  scheduleTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(3),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: wp(3),
  },
  taskCheckbox: {
    width: hp(2.5),
    height: hp(2.5),
  },
  taskCheckboxInner: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: theme.colors.bondedPurple,
    borderColor: theme.colors.bondedPurple,
  },
  taskCheckmark: {
    fontSize: hp(1.5),
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  scheduleTaskContent: {
    flex: 1,
  },
  scheduleTaskTitle: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.3),
  },
  scheduleTaskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
    opacity: 0.6,
  },
  scheduleTaskTime: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  scheduleTaskSticker: {
    fontSize: hp(2.5),
  },
  scheduleDateSection: {
    paddingHorizontal: wp(4),
    marginBottom: hp(4),
  },
  scheduleDateHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
    paddingBottom: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  scheduleDateTitle: {
    fontSize: hp(2.2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  scheduleDateSubtitle: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  scheduleEventItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: wp(3.5),
    marginBottom: hp(2),
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  scheduleEventTimeColumn: {
    width: wp(18),
    paddingRight: wp(2),
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    marginRight: wp(3),
  },
  scheduleEventTime: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.2),
  },
  scheduleEventEndTime: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  scheduleEventContent: {
    flex: 1,
  },
  scheduleEventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: hp(0.8),
    gap: wp(2),
  },
  scheduleEventTitle: {
    flex: 1,
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    lineHeight: hp(2.4),
  },
  scheduleEventSticker: {
    fontSize: hp(2.5),
  },
  scheduleEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginBottom: hp(0.8),
  },
  scheduleEventLocation: {
    flex: 1,
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  scheduleEventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleEventTypeBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: theme.radius.pill,
  },
  scheduleEventTypeText: {
    fontSize: hp(1.2),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  scheduleEventDuration: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  scheduleEmptyState: {
    paddingVertical: hp(8),
    alignItems: 'center',
    paddingHorizontal: wp(4),
  },
  scheduleEmptyText: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.8),
  },
  scheduleEmptySubtext: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  createEventModalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '90%',
  },
  createEventModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  createEventModalTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalCancelText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
    color: theme.colors.accent,
  },
  modalCreateText: {
    fontWeight: '600',
  },
  createEventModalBody: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  createEventField: {
    marginBottom: hp(2.5),
  },
  createEventLabel: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTypeSelector: {
    flexDirection: 'row',
    gap: wp(2),
  },
  eventTypeOption: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  eventTypeOptionActive: {
    backgroundColor: theme.colors.accent + '15',
    borderColor: theme.colors.accent,
  },
  eventTypeOptionText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  eventTypeOptionTextActive: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  createEventInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createEventSelectField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: wp(2),
  },
  createEventSelectText: {
    flex: 1,
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  recurringOptions: {
    marginTop: hp(1.5),
    padding: wp(3),
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    gap: hp(2),
  },
  recurringOptionRow: {
    gap: hp(1),
  },
  recurringOptionLabel: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.8),
  },
  recurringFrequencySelector: {
    flexDirection: 'row',
    gap: wp(2),
  },
  recurringFrequencyOption: {
    flex: 1,
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  recurringFrequencyOptionActive: {
    backgroundColor: theme.colors.bondedPurple + '15',
    borderColor: theme.colors.bondedPurple,
  },
  recurringFrequencyOptionText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  recurringFrequencyOptionTextActive: {
    color: theme.colors.bondedPurple,
    fontWeight: '600',
  },
  recurringDaysSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
  },
  recurringDayChip: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: wp(12),
    alignItems: 'center',
  },
  recurringDayChipActive: {
    backgroundColor: theme.colors.bondedPurple,
    borderColor: theme.colors.bondedPurple,
  },
  recurringDayChipText: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  recurringDayChipTextActive: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  recurringEndDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recurringEndDateText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  stickerIcon: {
    fontSize: hp(2.5),
  },
  stickerPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    padding: wp(4),
    justifyContent: 'center',
  },
  stickerOption: {
    width: wp(12),
    height: wp(12),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  stickerOptionActive: {
    borderColor: theme.colors.bondedPurple,
    backgroundColor: theme.colors.bondedPurple + '15',
    borderWidth: 3,
  },
  stickerEmoji: {
    fontSize: hp(3),
  },
  stickerCheckmark: {
    position: 'absolute',
    top: -hp(0.5),
    right: -hp(0.5),
    width: hp(2.5),
    height: hp(2.5),
    borderRadius: hp(1.25),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  stickerCheckmarkText: {
    fontSize: hp(1.2),
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  removeStickerButton: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
  },
  removeStickerButtonText: {
    fontSize: hp(2.5),
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  pickerModalBody: {
    maxHeight: hp(60),
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalCloseText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  modalBody: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: theme.radius.md,
    marginBottom: hp(1),
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionRowSelected: {
    backgroundColor: theme.colors.bondedPurple + '10',
    borderColor: theme.colors.bondedPurple,
  },
  optionText: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  checkmark: {
    fontSize: hp(2),
    color: theme.colors.accent,
    fontWeight: '700',
  },
  inviteeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: theme.radius.md,
    marginBottom: hp(1),
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inviteeRowSelected: {
    backgroundColor: theme.colors.bondedPurple + '10',
    borderColor: theme.colors.bondedPurple,
  },
  inviteeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inviteeAvatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  inviteeAvatarImage: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    marginRight: wp(3),
  },
  inviteeAvatarText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  inviteeName: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingBottom: hp(2),
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerModalTitle: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  pickerModalButton: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  pickerModalButtonDone: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  timeIcon: {
    fontSize: hp(2),
  },
  createEventHint: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    padding: wp(3),
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  infoBoxText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    lineHeight: hp(2),
  },
})
