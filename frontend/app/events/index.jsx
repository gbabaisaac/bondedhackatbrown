import { useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppTopBar from '../../components/AppTopBar'
import BottomNav from '../../components/BottomNav'
import EventCard from '../../components/Events/EventCard'
import { Add, Heart, HeartFill, Search } from '../../components/Icons'
import { hp, wp } from '../../helpers/common'
import { useEventsForUser } from '../../hooks/events/useEventsForUser'
import { useEventLikes, useToggleEventLike } from '../../hooks/events/useEventLikes'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { isFeatureEnabled } from '../../utils/featureGates'
import ThemedText from '../components/ThemedText'
import ThemedView from '../components/ThemedView'
import { useAppTheme } from '../theme'

const TAB_OPTIONS = [
  { id: 'browse', label: 'Browse' },
  { id: 'going', label: 'Going' },
  { id: 'myEvents', label: 'My Events' },
]

const DATE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'thisWeek', label: 'This Week' },
]

export default function EventsHome() {
  const router = useRouter()
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('browse')
  const [refreshing, setRefreshing] = useState(false)
  const [showLikedOnly, setShowLikedOnly] = useState(false)

  const { user } = useAuthStore()

  // Attendance state - will be loaded from database
  const [eventAttendance, setEventAttendance] = useState({}) // { eventId: 'going' | 'pending' }

  const currentUserId = user?.id || 'anonymous'

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
  } = useEventsForUser(user?.id)

  // Flatten paginated data into a single array
  const events = useMemo(() => {
    console.log('📊 Events data structure:', {
      hasPagesArray: !!data?.pages,
      pagesCount: data?.pages?.length || 0,
      firstPageEvents: data?.pages?.[0]?.events?.length || 0,
      totalPages: data?.pages?.length,
    })

    if (!data?.pages) {
      console.log('⚠️ No pages data available')
      return []
    }

    const flattenedEvents = data.pages.flatMap((page) => page.events || [])
    console.log('✅ Flattened events count:', flattenedEvents.length)

    return flattenedEvents
  }, [data])

  const eventIds = useMemo(() => events.map(e => e.id), [events])
  const { data: likedEvents = [] } = useEventLikes(eventIds)
  const toggleLike = useToggleEventLike()
  const likedEventIds = useMemo(() => new Set(likedEvents.map(e => e.event_id)), [likedEvents])

  // Check if any page has RLS errors (degraded mode)
  const hasRlsError = useMemo(() => {
    return data?.pages?.some((page) => page.rlsError) || false
  }, [data])

  // Load attendance status from database on mount and when events change
  React.useEffect(() => {
    if (!user?.id || !events || events.length === 0) return

    const loadAttendance = async () => {
      try {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('event_attendance')
          .select('event_id, status')
          .eq('user_id', user.id)
          .in('event_id', events.map(e => e.id))

        if (attendanceError) {
          console.error('Error loading attendance:', attendanceError)
          return
        }

        // Build attendance map from database
        const attendanceMap = {}
        attendanceData?.forEach((att) => {
          if (att.status === 'going' || att.status === 'approved') {
            attendanceMap[att.event_id] = 'going'
          } else if (att.status === 'requested') {
            attendanceMap[att.event_id] = 'pending'
          }
        })

        setEventAttendance(attendanceMap)
      } catch (err) {
        console.error('Error loading event attendance:', err)
      }
    }

    loadAttendance()
  }, [user?.id, events?.length])

  // Log loading state and errors
  React.useEffect(() => {
    console.log('📡 Events loading state:', { isLoading, hasData: !!data, eventCount: events?.length || 0, error: error?.message })
  }, [isLoading, data, events?.length, error])

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }

  const loadMoreEvents = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  const tabEvents = useMemo(() => {
    switch (activeTab) {
      case 'going':
        // Include both going and pending (pending approval) events
        return events.filter((event) =>
          eventAttendance[event.id] === 'going' ||
          eventAttendance[event.id] === 'pending'
        )
      case 'myEvents':
        // Filter events where current user is the organizer
        return events.filter((event) => event.organizer_id === user?.id)
      case 'browse':
      default:
        return events
    }
  }, [events, activeTab, eventAttendance, user?.id])

  const filteredEvents = useMemo(() => {
    let result = tabEvents

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((event) => {
        return (
          event.title?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location_name?.toLowerCase().includes(query) ||
          event.org?.name?.toLowerCase().includes(query)
        )
      })
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(today)
    endOfToday.setHours(23, 59, 59, 999)

    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    // Only apply date filters for Browse tab
    if (activeTab === 'browse') {
      switch (activeFilter) {
        case 'today':
          result = result.filter((event) => {
            const eventDate = new Date(event.start_at)
            return eventDate >= today && eventDate <= endOfToday
          })
          break
        case 'thisWeek':
          result = result.filter((event) => {
            const eventDate = new Date(event.start_at)
            return eventDate >= startOfWeek && eventDate <= endOfWeek
          })
          break
        default:
          break
      }
    }

    if (showLikedOnly) {
      result = result.filter(event => likedEventIds.has(event.id))
    }

    return result.sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
  }, [tabEvents, searchQuery, activeFilter, showLikedOnly, likedEventIds])

  const sections = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(today)
    endOfToday.setHours(23, 59, 59, 999)

    const tonight = new Date(today)
    tonight.setHours(18, 0, 0, 0)

    const featured = []
    const tonightEvents = []
    const upcoming = []

    filteredEvents.forEach((event) => {
      const eventDate = new Date(event.start_at)

      if (eventDate >= today && eventDate <= endOfToday && eventDate >= tonight) {
        tonightEvents.push(event)
      } else if (eventDate > endOfToday) {
        upcoming.push(event)
      }

      if (event.visibility === 'public' && (event.attendees_count || 0) > 10) {
        featured.push(event)
      }
    })

    return {
      featured: featured.slice(0, 5),
      tonight: tonightEvents,
      upcoming,
    }
  }, [filteredEvents])

  const handleEventAction = useCallback((eventId, action) => {
    if (action === 'going') {
      setEventAttendance((prev) => ({
        ...prev,
        [eventId]: prev[eventId] === 'going' ? null : 'going',
      }))
    } else if (action === 'request') {
      setEventAttendance((prev) => ({
        ...prev,
        [eventId]: 'pending',
      }))
    }
  }, [])

  const renderEventCard = ({ item }) => (
    <View style={styles.eventCardWrapper}>
      <EventCard
        event={item}
        onPress={() => {
          if (activeTab === 'myEvents') {
            router.push({ pathname: '/events/manage/[id]', params: { id: item.id } })
          } else {
            router.push({ pathname: '/events/[id]', params: { id: item.id } })
          }
        }}
        currentUserId={currentUserId}
        attendanceStatus={eventAttendance[item.id]}
        onAction={handleEventAction}
        isLiked={likedEventIds.has(item.id)}
        onToggleLike={(eventId) => {
          if (!user?.id) return
          const isLiked = likedEventIds.has(eventId)
          toggleLike.mutate({ eventId, isLiked })
        }}
      />
      {activeTab === 'myEvents' && (
        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => router.push(`/events/manage/${item.id}`)}
          activeOpacity={0.8}
        >
          <Text style={styles.manageButtonText}>Manage</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  const renderSection = (title, events, showIfEmpty = false) => {
    if (events.length === 0 && !showIfEmpty) return null

    return (
      <View style={styles.section}>
        {title && (
          <ThemedText style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            {title}
          </ThemedText>
        )}
        {events.map((event) => (
          <View key={event.id} style={styles.eventCardWrapper}>
            <EventCard
              event={event}
              onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
              currentUserId={currentUserId}
              isLiked={likedEventIds.has(event.id)}
              onToggleLike={(eventId) => {
                if (!user?.id) return
                const isLiked = likedEventIds.has(eventId)
                toggleLike.mutate({ eventId, isLiked })
              }}
            />
          </View>
        ))}
      </View>
    )
  }

  const renderScrollableHeader = () => (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
          <Search size={hp(2)} color={theme.colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push('/events/create')} style={styles.createEventIconButton} activeOpacity={0.7}>
              <Add size={hp(2.2)} color={theme.colors.accent} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs - Messages Style */}
      <View style={styles.tabContainer}>
        {TAB_OPTIONS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => {
              setActiveTab(tab.id)
              // Reset filters when switching tabs
              if (tab.id !== 'browse') {
                setActiveFilter('all')
              }
            }}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.likeFilterButton, showLikedOnly && styles.likeFilterButtonActive]}
          onPress={() => setShowLikedOnly(prev => !prev)}
          activeOpacity={0.7}
        >
          {showLikedOnly ? (
            <HeartFill size={hp(2)} color="#FF3B30" strokeWidth={2} fill="#FF3B30" />
          ) : (
            <Heart size={hp(2)} color={theme.colors.textSecondary} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>

      {/* Date Filters - Only show for Browse tab */}
      {activeTab === 'browse' && (
        <View style={styles.dateFilterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateFilterScroll}>
            {DATE_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.dateFilterChip,
                  activeFilter === filter.id && styles.dateFilterChipActive,
                ]}
                onPress={() => setActiveFilter(filter.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateFilterText,
                    activeFilter === filter.id && styles.dateFilterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  )

  const renderSkeleton = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {renderScrollableHeader()}
      <View style={styles.skeletonSection}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={`skeleton-${index}`} style={styles.skeletonCard}>
            <View style={styles.skeletonImage} />
            <View style={styles.skeletonLinePrimary} />
            <View style={styles.skeletonLineSecondary} />
            <View style={styles.skeletonMetaRow}>
              <View style={styles.skeletonPill} />
              <View style={styles.skeletonPillSmall} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  )

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <ThemedView style={styles.container}>
        <AppTopBar
          schoolName="University of Rhode Island"
          onPressProfile={() => router.push('/profile')}
          onPressSchool={() => {}}
          onPressNotifications={() => router.push('/notifications')}
          style={{ backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }}
          titleStyle={{ color: theme.colors.textPrimary }}
          iconColor={theme.colors.textPrimary}
        />
        {hasRlsError && (
          <View style={[styles.rlsWarningBanner, { backgroundColor: theme.colors.warning || '#FFA500' }]}>
            <Text style={styles.rlsWarningText}>
              Some events may not be visible. Pull to refresh or try again later.
            </Text>
          </View>
        )}
        {isLoading ? (
          renderSkeleton()
        ) : filteredEvents.length === 0 && !isLoading ? (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {renderScrollableHeader()}
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textPrimary }]}>
                {activeTab === 'going' && "No events you're going to"}
                {activeTab === 'myEvents' && "You haven't created any events"}
                {activeTab === 'browse' && 'No events found'}
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                {activeTab === 'going' && 'RSVP to events to see them here'}
                {activeTab === 'myEvents' && 'Create your first event to get started'}
                {activeTab === 'browse' && (searchQuery.trim() || activeFilter !== 'all' ? 'Try adjusting your filters or search' : 'Be the first to create an event!')}
              </Text>
              {(activeTab === 'myEvents' || (activeTab === 'browse' && !searchQuery.trim() && activeFilter === 'all')) && (
                <TouchableOpacity 
                  style={[styles.createFirstButton, { backgroundColor: theme.colors.accent }]} 
                  onPress={() => router.push('/events/create')} 
                  activeOpacity={0.8}
                >
                  <Text style={styles.createFirstButtonText}>Create Event</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            data={filteredEvents}
            renderItem={renderEventCard}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <>
                {renderScrollableHeader()}
                {activeTab === 'browse' ? (
                  <View style={{ paddingTop: hp(1.5) }}>
                    {renderSection('', sections.featured)}
                    {renderSection('Tonight', sections.tonight)}
                  </View>
                ) : <View style={{ paddingTop: hp(1.5) }} />}
              </>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreEvents}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={{ padding: hp(2), alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.textSecondary }}>Loading more events...</Text>
                </View>
              ) : null
            }
          />
        )}
        <BottomNav />
      </ThemedView>
    </SafeAreaView>
  )
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  searchContainer: { paddingHorizontal: theme.spacing.xl, paddingTop: hp(0.4), paddingBottom: theme.spacing.xs, gap: theme.spacing.xs },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: theme.radius.xl, paddingHorizontal: wp(4), paddingVertical: hp(1.2), gap: wp(2), ...theme.shadows.sm },
  searchInput: { flex: 1, fontSize: hp(1.6), fontFamily: theme.typography.fontFamily.body, color: theme.colors.textPrimary },
  clearButton: { paddingHorizontal: wp(2) },
  clearButtonText: { fontSize: hp(1.4), fontFamily: theme.typography.fontFamily.body, color: theme.colors.accent, fontWeight: '600' },

  // Messages-style tabs
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(0.5),
    gap: wp(6),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    paddingBottom: hp(1),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.accent,
  },
  tabText: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.textPrimary,
  },
  likeFilterButton: {
    marginLeft: 'auto',
    padding: hp(0.8),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  likeFilterButtonActive: {
    backgroundColor: '#FF3B3020',
  },

  // Date filter chips (compact, below tabs)
  dateFilterContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  dateFilterScroll: {
    gap: wp(2),
  },
  dateFilterChip: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  dateFilterChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  dateFilterText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  dateFilterTextActive: {
    color: '#FFFFFF',
  },

  manageButton: { marginTop: hp(1), paddingVertical: hp(1), paddingHorizontal: wp(4), backgroundColor: theme.colors.accent, borderRadius: theme.radius.lg, alignItems: 'center' },
  manageButtonText: { fontSize: hp(1.5), fontFamily: theme.typography.fontFamily.body, fontWeight: '700', color: theme.colors.white },
  listContent: { paddingBottom: hp(12), paddingHorizontal: wp(4) },
  section: { marginBottom: hp(3) },
  sectionTitle: { fontSize: hp(2.2), fontFamily: theme.typography.fontFamily.heading, fontWeight: '700', color: theme.colors.textPrimary, paddingHorizontal: wp(5), marginBottom: hp(1.5) },
  eventCardWrapper: { paddingHorizontal: wp(4), marginBottom: hp(2) },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: hp(10) },
  loadingText: { fontSize: hp(1.8), fontFamily: theme.typography.fontFamily.body, color: theme.colors.textSecondary },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: hp(10), paddingHorizontal: wp(4) },
  emptyText: { fontSize: hp(2), fontFamily: theme.typography.fontFamily.heading, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: hp(1) },
  emptySubtext: { fontSize: hp(1.5), fontFamily: theme.typography.fontFamily.body, color: theme.colors.textSecondary, textAlign: 'center', marginTop: hp(0.5) },
  createFirstButton: { marginTop: hp(3), backgroundColor: theme.colors.accent, paddingHorizontal: wp(6), paddingVertical: hp(1.5), borderRadius: theme.radius.xl },
  createFirstButtonText: { fontSize: hp(1.7), fontFamily: theme.typography.fontFamily.body, fontWeight: '700', color: theme.colors.white },
  createEventIconButton: { padding: hp(0.5) },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: hp(12) },
  rlsWarningBanner: { paddingVertical: hp(1), paddingHorizontal: wp(4), alignItems: 'center' },
  rlsWarningText: { fontSize: hp(1.4), fontFamily: theme.typography.fontFamily.body, color: '#FFFFFF', textAlign: 'center' },
  skeletonSection: { paddingHorizontal: wp(4), paddingTop: hp(1.5), gap: hp(2) },
  skeletonCard: { borderRadius: theme.radius.xl, backgroundColor: theme.colors.surface, padding: wp(4), gap: hp(1.2), borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  skeletonImage: { width: '100%', height: hp(16), borderRadius: theme.radius.lg, backgroundColor: theme.colors.border },
  skeletonLinePrimary: { height: hp(1.8), width: '70%', borderRadius: hp(1), backgroundColor: theme.colors.border },
  skeletonLineSecondary: { height: hp(1.6), width: '55%', borderRadius: hp(1), backgroundColor: theme.colors.border },
  skeletonMetaRow: { flexDirection: 'row', gap: wp(2), marginTop: hp(0.5) },
  skeletonPill: { height: hp(2.8), width: wp(18), borderRadius: hp(2), backgroundColor: theme.colors.border },
  skeletonPillSmall: { height: hp(2.8), width: wp(12), borderRadius: hp(2), backgroundColor: theme.colors.border },
})
