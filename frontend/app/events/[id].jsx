import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppTopBar from '../../components/AppTopBar'
import BottomNav from '../../components/BottomNav'
import { Calendar, ChevronLeft, MapPin, Users } from '../../components/Icons'
import Button from '../../components/ui/Button'
import { hp, wp } from '../../helpers/common'
import { getFriendlyErrorMessage } from '../../utils/userFacingErrors'
import { getStaticMapUrl } from '../../helpers/mapUtils'
import { useEvent } from '../../hooks/events/useEvent'
import { useEventActions } from '../../hooks/events/useEventActions'
import { useFriends } from '../../hooks/useFriends'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { formatDateTime } from '../../utils/dateFormatters'
import { useAppTheme } from '../theme'

const EMPTY_ATTENDANCE = []

export default function EventDetail() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const { id } = useLocalSearchParams()
  // Normalize eventId - ensure it's a string and handle array case
  const eventId = Array.isArray(id) ? String(id[0]) : id ? String(id) : null
  const { data: event, isLoading, error, refetch } = useEvent(eventId)
  const { user } = useAuthStore()
  const { attendanceState, toggleGoing, requestJoin, isLoading: isActionLoading } = useEventActions(event, user?.id)
  const { data: friends = [] } = useFriends()
  const [mapUrl, setMapUrl] = useState(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [isVisibilityUpdating, setIsVisibilityUpdating] = useState(false)

  // Debug logging
  useEffect(() => {
    if (eventId) {
      console.log('🔍 EventDetail - eventId:', eventId, 'type:', typeof eventId)
    } else {
      console.warn('⚠️ EventDetail - No eventId found in params')
    }
    if (error) {
      console.error('❌ EventDetail - Error loading event:', error)
    }
    if (event) {
      console.log('✅ EventDetail - Event loaded:', { id: event.id, title: event.title })
    }
  }, [eventId, event, error])

  // Load map preview when event location is available
  useEffect(() => {
    let isActive = true
    const loadMap = async () => {
      if (!event?.location_name && !event?.location_address) return
      setMapLoading(true)
      const location = event.location_address || event.location_name
      try {
        const staticMapUrl = await getStaticMapUrl(location, wp(90), hp(20))
        if (isActive) {
          setMapUrl(staticMapUrl)
        }
      } finally {
        if (isActive) {
          setMapLoading(false)
        }
      }
    }

    loadMap()

    return () => {
      isActive = false
    }
  }, [event?.location_name, event?.location_address])

  const openMaps = () => {
    const location = event?.location_address || event?.location_name
    if (!location) return
    const encodedLocation = encodeURIComponent(location)
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${encodedLocation}`,
      android: `geo:0,0?q=${encodedLocation}`,
    })
    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://maps.google.com/?q=${encodedLocation}`)
      })
    }
  }

  const attendance = event?.attendance || EMPTY_ATTENDANCE
  const friendIds = useMemo(() => new Set(friends.map(friend => friend.id)), [friends])
  const goingAttendees = useMemo(() => (
    attendance.filter((attendee) =>
      attendee.status === 'going' || attendee.status === 'approved'
    )
  ), [attendance])
  const attendeesCount = goingAttendees.length || event?.attendees_count || 0
  const visibleAttendees = useMemo(() => (
    goingAttendees.filter((attendee) =>
      attendee.user_id === user?.id ||
      friendIds.has(attendee.user_id) ||
      attendee.is_public
    )
  ), [friendIds, goingAttendees, user?.id])
  const anonymousCount = Math.max(0, goingAttendees.length - visibleAttendees.length)
  const myAttendance = useMemo(() => (
    goingAttendees.find((attendee) => attendee.user_id === user?.id) || null
  ), [goingAttendees, user?.id])

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <AppTopBar
            schoolName="University of Rhode Island"
            onPressProfile={() => router.push('/profile')}
            onPressSchool={() => {}}
            onPressNotifications={() => router.push('/notifications')}
          />
          <View style={styles.centered}>
            <Text style={styles.loadingText}>Loading event…</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (!eventId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <AppTopBar
            schoolName="University of Rhode Island"
            onPressProfile={() => router.push('/profile')}
            onPressSchool={() => {}}
            onPressNotifications={() => router.push('/notifications')}
          />
          <View style={styles.centered}>
            <Text style={styles.errorText}>Invalid event ID</Text>
            <Text style={styles.errorSubtext}>The event ID is missing or invalid.</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (error || (!isLoading && !event)) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <AppTopBar
            schoolName="University of Rhode Island"
            onPressProfile={() => router.push('/profile')}
            onPressSchool={() => {}}
            onPressNotifications={() => router.push('/notifications')}
          />
          <View style={styles.centered}>
            <Text style={styles.errorText}>Event not found</Text>
            <Text style={styles.errorSubtext}>
              {getFriendlyErrorMessage(error, 'The event you\'re looking for doesn\'t exist or has been removed.')}
            </Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  const togglePublicVisibility = async () => {
    if (!event?.id || !user?.id || !myAttendance) return
    if (isVisibilityUpdating) return
    setIsVisibilityUpdating(true)
    const { error: updateError } = await supabase
      .from('event_attendance')
      .update({ is_public: !myAttendance.is_public })
      .eq('event_id', event.id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating RSVP visibility:', updateError)
      Alert.alert('Error', 'Could not update your RSVP visibility.')
    } else {
      await refetch()
    }
    setIsVisibilityUpdating(false)
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <AppTopBar
          schoolName="University of Rhode Island"
          onPressProfile={() => router.push('/profile')}
          onPressSchool={() => {}}
          onPressNotifications={() => router.push('/notifications')}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Event Image */}
          {event.image_url ? (
            <Image source={{ uri: event.image_url }} style={styles.eventImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Calendar size={hp(6)} color={theme.colors.textSecondary} strokeWidth={2} />
            </View>
          )}

          <View style={styles.content}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                <ChevronLeft size={hp(2.4)} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>{event.title}</Text>

            {event.start_at && (
              <View style={styles.infoRow}>
                <Calendar size={hp(2.2)} color={theme.colors.bondedPurple} />
                <Text style={styles.infoText}>{formatDateTime(event.start_at)}</Text>
              </View>
            )}

            {event.location_name && (
              <TouchableOpacity style={styles.infoRow} onPress={openMaps} activeOpacity={0.7}>
                <MapPin size={hp(2.2)} color={theme.colors.bondedPurple} />
                <Text style={[styles.infoText, styles.linkText]}>{event.location_name}</Text>
              </TouchableOpacity>
            )}

            {/* Map Preview */}
            {(event.location_name || event.location_address) && (
              <TouchableOpacity 
                style={styles.mapPreviewContainer} 
                onPress={openMaps}
                activeOpacity={0.9}
              >
                {mapLoading ? (
                  <View style={styles.mapPlaceholder}>
                    <Text style={styles.mapPlaceholderText}>Loading map...</Text>
                  </View>
                ) : mapUrl ? (
                  <Image 
                    source={{ uri: mapUrl }} 
                    style={styles.mapPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <MapPin size={hp(4)} color={theme.colors.textSecondary} />
                    <Text style={styles.mapPlaceholderText}>Map preview</Text>
                  </View>
                )}
                <View style={styles.mapOverlay}>
                  <View style={styles.mapOverlayContent}>
                    <MapPin size={hp(2)} color={theme.colors.white} />
                    <Text style={styles.mapOverlayText}>Tap to open in Maps</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.infoRow}>
              <Users size={hp(2.2)} color={theme.colors.bondedPurple} />
              <Text style={styles.infoText}>{attendeesCount} going</Text>
            </View>

            <View style={styles.attendeesSection}>
              <View style={styles.attendeesHeader}>
                <Text style={styles.sectionTitle}>Who's going</Text>
                <Text style={styles.attendeesMeta}>{attendeesCount} total</Text>
              </View>

              {event.hide_guest_list ? (
                <Text style={styles.attendeesHiddenText}>Guest list hidden by organizer.</Text>
              ) : (
                <>
                  {attendanceState?.isGoing && (
                    <View style={styles.publicToggleRow}>
                      <View style={styles.publicToggleText}>
                        <Text style={styles.publicToggleTitle}>Show me publicly</Text>
                        <Text style={styles.publicToggleSubtitle}>Non-friends can see your name</Text>
                      </View>
                      <Switch
                        value={!!myAttendance?.is_public}
                        onValueChange={togglePublicVisibility}
                        disabled={isVisibilityUpdating}
                        trackColor={{
                          false: theme.colors.backgroundSecondary,
                          true: theme.colors.accent,
                        }}
                        thumbColor={theme.colors.white}
                      />
                    </View>
                  )}

                  {visibleAttendees.length > 0 ? (
                    <View style={styles.attendeesList}>
                      {visibleAttendees.map((attendee) => {
                        const displayName = attendee.user?.full_name || attendee.user?.username || 'User'
                        const showName = attendee.user_id === user?.id || friendIds.has(attendee.user_id) || attendee.is_public
                        return (
                          <View key={attendee.id} style={styles.attendeeRow}>
                            {attendee.user?.avatar_url && showName ? (
                              <Image source={{ uri: attendee.user.avatar_url }} style={styles.attendeeAvatar} />
                            ) : (
                              <View style={styles.attendeeAvatarPlaceholder}>
                                <Text style={styles.attendeeAvatarText}>
                                  {showName ? displayName.charAt(0).toUpperCase() : '?'}
                                </Text>
                              </View>
                            )}
                            <View style={styles.attendeeInfo}>
                              <Text style={styles.attendeeName}>
                                {showName ? displayName : 'Anonymous'}
                              </Text>
                              {friendIds.has(attendee.user_id) && attendee.user_id !== user?.id && (
                                <Text style={styles.attendeeMeta}>Friend</Text>
                              )}
                              {!friendIds.has(attendee.user_id) && attendee.is_public && (
                                <Text style={styles.attendeeMeta}>Public</Text>
                              )}
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  ) : (
                    <Text style={styles.attendeesEmptyText}>No public attendees yet.</Text>
                  )}

                  {anonymousCount > 0 && (
                    <Text style={styles.attendeesAnonymousText}>
                      {anonymousCount} going anonymously
                    </Text>
                  )}
                </>
              )}
            </View>

            {event.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.description}>{event.description}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Join Button - Fixed at bottom */}
        {user && (
          <View style={styles.actionContainer}>
            {!event.requires_approval && !event.is_paid && (
              <Button
                title={attendanceState?.isGoing ? 'Going ✓' : 'Join'}
                variant="primary"
                onPress={() => {
                  toggleGoing()
                  if (!attendanceState?.isGoing) {
                    Alert.alert('Success', 'You\'re going to this event!')
                  }
                }}
                disabled={isActionLoading}
                style={styles.joinButton}
                textStyle={styles.joinButtonText}
              />
            )}

            {event.requires_approval && !attendanceState?.isRequested && !attendanceState?.isGoing && (
              <Button
                title="Request to Join"
                variant="secondary"
                onPress={() => {
                  requestJoin()
                  Alert.alert('Request Sent', 'Your request to join has been sent to the organizer.')
                }}
                disabled={isActionLoading}
                style={styles.joinButton}
                textStyle={styles.joinButtonText}
              />
            )}

            {attendanceState?.isRequested && (
              <Button
                title="Request Pending"
                variant="secondary"
                disabled
                style={[styles.joinButton, styles.joinButtonPending]}
                textStyle={[styles.joinButtonText, styles.joinButtonTextPending]}
              />
            )}

            {event.is_paid && (
              <Button
                title="Buy Ticket"
                variant="primary"
                onPress={() => {
                  Alert.alert('Coming Soon', 'Ticket purchasing will be available soon!')
                }}
                style={styles.joinButton}
                textStyle={styles.joinButtonText}
              />
            )}
          </View>
        )}

        <BottomNav />
      </View>
    </SafeAreaView>
  )
}

const createStyles = (theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: hp(20), // Extra space for fixed button
    },
    eventImage: {
      width: '100%',
      height: hp(30),
      backgroundColor: theme.colors.backgroundSecondary,
    },
    imagePlaceholder: {
      width: '100%',
      height: hp(30),
      backgroundColor: theme.colors.accent + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      paddingHorizontal: wp(5),
      paddingTop: hp(2),
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: hp(1.8),
      color: theme.colors.textSecondary,
    },
    errorText: {
      fontSize: hp(2),
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: hp(1),
    },
    errorSubtext: {
      fontSize: hp(1.6),
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: hp(2),
      paddingHorizontal: wp(5),
    },
    backButton: {
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.2),
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.accent,
    },
    backButtonText: {
      color: theme.colors.white,
      fontSize: hp(1.6),
      fontWeight: '600',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: hp(1.5),
      marginBottom: hp(2),
    },
    headerBackButton: {
      paddingRight: wp(2),
      paddingVertical: hp(0.5),
    },
    headerTitle: {
      fontSize: hp(2),
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    title: {
      fontSize: hp(2.6),
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: hp(1.5),
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: hp(1),
    },
    infoText: {
      marginLeft: wp(2),
      fontSize: hp(1.7),
      color: theme.colors.textPrimary,
    },
    linkText: {
      textDecorationLine: 'underline',
    },
    mapPreviewContainer: {
      marginTop: hp(2),
      marginBottom: hp(1),
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.backgroundSecondary,
      position: 'relative',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    mapPreview: {
      width: '100%',
      height: hp(20),
      backgroundColor: theme.colors.backgroundSecondary,
    },
    mapPlaceholder: {
      width: '100%',
      height: hp(20),
      backgroundColor: theme.colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      gap: hp(1),
    },
    mapPlaceholderText: {
      fontSize: hp(1.6),
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily.body,
    },
    mapOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingVertical: hp(1),
      paddingHorizontal: wp(4),
    },
    mapOverlayContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: wp(2),
    },
    mapOverlayText: {
      fontSize: hp(1.5),
      color: theme.colors.white,
      fontFamily: theme.typography.fontFamily.body,
      fontWeight: '600',
    },
    section: {
      marginTop: hp(3),
    },
    attendeesSection: {
      marginTop: hp(2.5),
      padding: wp(3.5),
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    attendeesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: hp(1.2),
    },
    attendeesMeta: {
      fontSize: hp(1.5),
      color: theme.colors.textSecondary,
    },
    attendeesHiddenText: {
      fontSize: hp(1.6),
      color: theme.colors.textSecondary,
    },
    publicToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: hp(1),
      paddingHorizontal: wp(2),
      backgroundColor: theme.colors.background,
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      marginBottom: hp(1.5),
    },
    publicToggleText: {
      flex: 1,
      paddingRight: wp(2),
    },
    publicToggleTitle: {
      fontSize: hp(1.6),
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    publicToggleSubtitle: {
      fontSize: hp(1.4),
      color: theme.colors.textSecondary,
      marginTop: hp(0.4),
    },
    attendeesList: {
      gap: hp(1.2),
    },
    attendeeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(2.5),
    },
    attendeeAvatar: {
      width: hp(4.2),
      height: hp(4.2),
      borderRadius: hp(2.1),
      backgroundColor: theme.colors.background,
    },
    attendeeAvatarPlaceholder: {
      width: hp(4.2),
      height: hp(4.2),
      borderRadius: hp(2.1),
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    attendeeAvatarText: {
      fontSize: hp(1.6),
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    attendeeInfo: {
      flex: 1,
    },
    attendeeName: {
      fontSize: hp(1.6),
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    attendeeMeta: {
      fontSize: hp(1.3),
      color: theme.colors.textSecondary,
      marginTop: hp(0.2),
    },
    attendeesEmptyText: {
      fontSize: hp(1.5),
      color: theme.colors.textSecondary,
      marginBottom: hp(0.8),
    },
    attendeesAnonymousText: {
      fontSize: hp(1.5),
      color: theme.colors.textSecondary,
      marginTop: hp(1),
    },
    sectionTitle: {
      fontSize: hp(2),
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: hp(1),
    },
    description: {
      fontSize: hp(1.7),
      color: theme.colors.textSecondary,
      lineHeight: hp(2.4),
    },
    actionContainer: {
      position: 'absolute',
      bottom: hp(8), // Above bottom nav
      left: 0,
      right: 0,
      paddingHorizontal: wp(5),
      paddingVertical: hp(2),
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    joinButton: {
      width: '100%',
      paddingVertical: hp(1.5),
      borderRadius: theme.radius.xl,
      minHeight: hp(5.5),
    },
    joinButtonPending: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    joinButtonText: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: '700',
    },
    joinButtonTextPending: {
      color: theme.colors.textSecondary,
    },
  })
