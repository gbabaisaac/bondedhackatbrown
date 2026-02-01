import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { hp, wp } from '../../../helpers/common'
import { useAppTheme } from '../../theme'
import { formatDateTime, formatTimeForDisplay } from '../../../utils/dateFormatters'
import { getFriendlyErrorMessage } from '../../../utils/userFacingErrors'
import { useEvent } from '../../../hooks/events/useEvent'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  Edit2,
  Trash2,
  Share2,
  Users,
  CheckCircle,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  MoreVertical,
} from '../../../components/Icons'

export default function ManageEvent() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('overview') // overview, attendees, requests
  const [showOptions, setShowOptions] = useState(false)

  // Normalize ID (handle array case from Expo Router)
  const eventId = Array.isArray(id) ? id[0] : id

  const { data: event, isLoading } = useEvent(eventId)

  // Check if current user is the organizer
  const isOrganizer = event?.organizer_id === user?.id

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['eventsForUser'] })
      Alert.alert('Success', 'Event deleted successfully', [
        { text: 'OK', onPress: () => router.replace('/events') }
      ])
    },
    onError: (error) => {
      console.error('Failed to delete event:', error)
      Alert.alert('Error', getFriendlyErrorMessage(error, 'Failed to delete event'))
    }
  })

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteEventMutation.mutate()
        }
      ]
    )
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this event: ${event?.title}\n${event?.location_name}\n${new Date(event?.start_at).toLocaleDateString()}`,
        title: event?.title,
      })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const handleEdit = () => {
    // Navigate to create screen with event data for editing
    router.push({
      pathname: '/events/create',
      params: {
        eventId: eventId,
        mode: 'edit',
      }
    })
  }


  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.bondedPurple} />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (!isOrganizer) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>You don't have permission to manage this event</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const totalAttendees = event?.attendees_count || 0
  const goingCount = totalAttendees
  const pendingCount = 0 // Would come from actual data

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={hp(2.5)} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Event</Text>
          <TouchableOpacity
            onPress={() => setShowOptions(!showOptions)}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <MoreVertical size={hp(2.5)} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Options Menu */}
        {showOptions && (
          <View style={styles.optionsMenu}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptions(false)
                handleEdit()
              }}
              activeOpacity={0.7}
            >
              <Edit2 size={hp(2)} color={theme.colors.textPrimary} />
              <Text style={styles.optionText}>Edit Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptions(false)
                handleShare()
              }}
              activeOpacity={0.7}
            >
              <Share2 size={hp(2)} color={theme.colors.textPrimary} />
              <Text style={styles.optionText}>Share Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionItem, styles.optionItemDanger]}
              onPress={() => {
                setShowOptions(false)
                handleDelete()
              }}
              activeOpacity={0.7}
            >
              <Trash2 size={hp(2)} color={theme.colors.error} />
              <Text style={[styles.optionText, styles.optionTextDanger]}>Delete Event</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Event Cover Image */}
          {event.image_url && (
            <Image
              source={{ uri: event.image_url }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          )}

          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Users size={hp(2.5)} color={theme.colors.bondedPurple} />
              <Text style={styles.statNumber}>{goingCount}</Text>
              <Text style={styles.statLabel}>Going</Text>
            </View>
            {event.requires_approval && (
              <View style={styles.statCard}>
                <Clock size={hp(2.5)} color={theme.colors.warning} />
                <Text style={styles.statNumber}>{pendingCount}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            )}
            <View style={styles.statCard}>
              <CheckCircle size={hp(2.5)} color={theme.colors.success} />
              <Text style={styles.statNumber}>{event.visibility}</Text>
              <Text style={styles.statLabel}>Visibility</Text>
            </View>
          </View>

          {/* Event Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Details</Text>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <CalendarIcon size={hp(2)} color={theme.colors.textSecondary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {formatDate(event.start_at)}
                </Text>
                <Text style={styles.detailValue}>
                  {formatTimeForDisplay(event.start_at)} - {formatTimeForDisplay(event.end_at)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MapPin size={hp(2)} color={theme.colors.textSecondary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{event.location_name}</Text>
                {event.location_address && (
                  <Text style={styles.detailSubtext}>{event.location_address}</Text>
                )}
              </View>
            </View>

            {event.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.descriptionText}>{event.description}</Text>
              </View>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
              onPress={() => setActiveTab('overview')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
                Overview
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'attendees' && styles.tabActive]}
              onPress={() => setActiveTab('attendees')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'attendees' && styles.tabTextActive]}>
                Attendees ({goingCount})
              </Text>
            </TouchableOpacity>
            {event.requires_approval && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
                onPress={() => setActiveTab('requests')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
                  Requests ({pendingCount})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <View style={styles.tabContent}>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewTitle}>Event Status</Text>
                <Text style={styles.overviewText}>
                  Your event is live and visible to {
                    event.visibility === 'public' ? 'everyone' :
                    event.visibility === 'school' ? 'your school' :
                    event.visibility === 'org_only' ? 'org members' :
                    'invited people'
                  }.
                </Text>
                {new Date(event.start_at) > new Date() && (
                  <Text style={styles.overviewSubtext}>
                    Event starts in {Math.ceil((new Date(event.start_at) - new Date()) / (1000 * 60 * 60 * 24))} days
                  </Text>
                )}
              </View>

              <View style={styles.actionsCard}>
                <Text style={styles.overviewTitle}>Quick Actions</Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleEdit}
                  activeOpacity={0.7}
                >
                  <Edit2 size={hp(2)} color={theme.colors.bondedPurple} />
                  <Text style={styles.actionButtonText}>Edit Event Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                  activeOpacity={0.7}
                >
                  <Share2 size={hp(2)} color={theme.colors.bondedPurple} />
                  <Text style={styles.actionButtonText}>Share Event</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'attendees' && (
            <View style={styles.tabContent}>
              {goingCount === 0 ? (
                <View style={styles.emptyState}>
                  <Users size={hp(5)} color={theme.colors.textSecondary} />
                  <Text style={styles.emptyStateText}>No attendees yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Share your event to get more people interested!
                  </Text>
                </View>
              ) : (
                <View style={styles.attendeesList}>
                  <Text style={styles.attendeesNote}>
                    Attendee management coming soon. You have {goingCount} people going to your event!
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'requests' && event.requires_approval && (
            <View style={styles.tabContent}>
              <View style={styles.emptyState}>
                <Clock size={hp(5)} color={theme.colors.textSecondary} />
                <Text style={styles.emptyStateText}>No pending requests</Text>
                <Text style={styles.emptyStateSubtext}>
                  Requests to join will appear here for your approval
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={handleEdit}
            activeOpacity={0.8}
          >
            <Edit2 size={hp(2)} color={theme.colors.white} />
            <Text style={styles.primaryActionText}>Edit Event</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Share2 size={hp(2)} color={theme.colors.bondedPurple} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  errorText: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: hp(3),
  },
  backButton: {
    backgroundColor: theme.colors.bondedPurple,
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: theme.radius.xl,
  },
  backButtonText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
  },
  headerButton: {
    padding: hp(0.5),
  },
  headerTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  optionsMenu: {
    position: 'absolute',
    top: hp(7),
    right: wp(4),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.lg,
    zIndex: 1000,
    minWidth: wp(50),
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    gap: wp(3),
  },
  optionItemDanger: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  optionText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  optionTextDanger: {
    color: theme.colors.error,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(12),
  },
  coverImage: {
    width: '100%',
    height: hp(25),
    backgroundColor: theme.colors.backgroundSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    gap: wp(3),
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: wp(4),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statNumber: {
    fontSize: hp(2.5),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: hp(1),
  },
  statLabel: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(0.5),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  sectionTitle: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: hp(2),
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: hp(2),
  },
  detailIcon: {
    width: hp(4),
    alignItems: 'center',
    paddingTop: hp(0.3),
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginBottom: hp(0.5),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  detailSubtext: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(0.3),
  },
  descriptionContainer: {
    marginTop: hp(2),
  },
  descriptionText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    lineHeight: hp(2.4),
    marginTop: hp(1),
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    marginTop: hp(2),
    gap: wp(2),
  },
  tab: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: theme.colors.bondedPurple,
    borderColor: theme.colors.bondedPurple,
  },
  tabText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  tabTextActive: {
    color: theme.colors.white,
  },
  tabContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
  },
  overviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: wp(4),
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: hp(2),
  },
  overviewTitle: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
  },
  overviewText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    lineHeight: hp(2.2),
  },
  overviewSubtext: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(1),
  },
  actionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: wp(4),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    gap: wp(3),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionButtonText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: hp(6),
  },
  emptyStateText: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: hp(2),
  },
  emptyStateSubtext: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(1),
    textAlign: 'center',
  },
  attendeesList: {
    paddingVertical: hp(2),
  },
  attendeesNote: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: wp(4),
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.offWhite,
    gap: wp(3),
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.xl,
    paddingVertical: hp(1.8),
    gap: wp(2),
  },
  primaryActionText: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
    color: theme.colors.white,
  },
  secondaryAction: {
    width: hp(5.4),
    height: hp(5.4),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
})
