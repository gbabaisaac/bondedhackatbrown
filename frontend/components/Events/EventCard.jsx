import React, { useState } from 'react'
import { Image, Share, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useAppTheme } from '../../app/theme'
import { hp, wp } from '../../helpers/common'
import { useEventActions } from '../../hooks/events/useEventActions'
import { useAuthStore } from '../../stores/authStore'
import { isFeatureEnabled } from '../../utils/featureGates'
import AppCard from '../AppCard'
import ShareModal from '../ShareModal'
import { Calendar, Heart, HeartFill, MapPin, Share2, Users, Settings } from '../Icons'
import Button from '../ui/Button'
import Text from '../ui/Text'
import { formatDate, formatTime } from '../../utils/dateFormatters'

export default function EventCard({ event, onPress, currentUserId, attendanceStatus, onAction, isLiked, onToggleLike }) {
  const theme = useAppTheme()
  const router = useRouter()
  const { user } = useAuthStore()
  const [showShareModal, setShowShareModal] = useState(false)
  const styles = createStyles(theme)

  // Use real Supabase integration if user is authenticated
  const userId = user?.id || currentUserId
  const { attendanceState, toggleGoing, requestJoin, isLoading: isActionLoading } = useEventActions(
    event,
    user?.id // Only pass real user ID, not anonymous
  )

  // Determine if user is going - prefer prop/local state first (for immediate UI feedback), then real state
  const isGoing = attendanceStatus === 'going' || attendanceState?.isGoing

  // Check if current user is the organizer
  const isOrganizer = user?.id && event?.organizer_id === user.id

  const handleShare = async (e) => {
    e.stopPropagation()
    try {
      await Share.share({
        message: `Check out this event: ${event.title}\n${event.description || ''}`,
        title: event.title,
      })
    } catch (error) {
      console.log('Share error:', error)
    }
  }

  const handleInAppShare = (e) => {
    e.stopPropagation()
    setShowShareModal(true)
  }

  const handleSave = (e) => {
    e.stopPropagation()
    if (onToggleLike) onToggleLike(event.id)
  }



  const getVisibilityBadge = () => {
    switch (event.visibility) {
      case 'public':
        return null // No badge for public
      case 'org_only':
        return { label: 'Org Only', color: theme.colors.info }
      case 'invite_only':
        return { label: 'Invite Only', color: '#FF6B6B' }
      case 'school':
        return { label: 'School Event', color: '#4ECDC4' }
      default:
        return null
    }
  }

  const visibilityBadge = getVisibilityBadge()
  const attendeesCount = event.attendees_count || 0

  return (
    <>
      <AppCard
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
        radius="lg"
        padding={false}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPress}
          style={styles.cardContent}
        >
        {/* Event Image - Clean, no text overlay */}
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Calendar size={hp(4)} color={theme.colors.textSecondary} strokeWidth={2} />
          </View>
        )}

        {/* Content Below Image - Eventbrite Style */}
        <View style={styles.contentContainer}>
          {/* Title Row with Action Icons */}
          <View style={styles.titleRow}>
            <Text variant="title" style={styles.title} numberOfLines={2}>
              {event.title}
            </Text>
            <View style={styles.actionIcons}>
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={handleInAppShare}
                onLongPress={handleShare}
                activeOpacity={0.7}
              >
                <Share2 size={hp(2.2)} color={theme.colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                {isLiked ? (
                  <HeartFill size={hp(2.2)} color="#FF3B30" strokeWidth={2} fill="#FF3B30" />
                ) : (
                  <Heart size={hp(2.2)} color={theme.colors.textSecondary} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Date, Time, Location - Clean single line */}
          <View style={styles.detailsRow}>
            <Calendar size={hp(1.6)} color={theme.colors.textSecondary} strokeWidth={2} />
            <Text variant="meta" style={styles.detailsText}>
              {formatDate(event.start_at)} • {formatTime(event.start_at)}
            </Text>
            {event.location_name && (
              <>
                <Text variant="meta" style={styles.detailsSeparator}>•</Text>
                <MapPin size={hp(1.6)} color={theme.colors.textSecondary} strokeWidth={2} />
                <Text variant="meta" style={styles.detailsText} numberOfLines={1}>
                  {event.location_name}
                </Text>
              </>
            )}
          </View>

          {/* Footer with Price and Attendees */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              {/* Price Badge */}
              {event.is_paid ? (
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>
                    From ${(event.ticket_types?.[0]?.price_cents || 0) / 100}
                  </Text>
                </View>
              ) : (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeText}>Free</Text>
                </View>
              )}

              {/* Attendees Count */}
              {attendeesCount > 0 && (
                <View style={styles.attendeesBadge}>
                  <Users size={hp(1.4)} color={theme.colors.textSecondary} strokeWidth={2} />
                  <Text variant="meta" style={styles.attendeesText}>{attendeesCount} going</Text>
                </View>
              )}

              {/* Going Badge */}
              {isGoing && (
                <View style={styles.goingBadge}>
                  <Text variant="meta" style={styles.goingText}>Going ✓</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Join Button / Manage Button - Eventbrite Style */}
        {(userId || onAction) && (
          <View style={styles.actionContainer}>
          {/* Manage Button for Organizer */}
          {isOrganizer && (
            <Button
              title="Manage Event"
              variant="secondary"
              onPress={(e) => {
                e.stopPropagation()
                router.push(`/events/manage/${event.id}`)
              }}
              style={[styles.joinButton, styles.manageButton]}
              textStyle={[styles.joinButtonText, styles.manageButtonText]}
              leftIcon={<Settings size={hp(1.8)} color={theme.colors.bondedPurple} />}
            />
          )}

          {/* Join buttons for non-organizers */}
          {!isOrganizer && !event.requires_approval && !event.is_paid && (
            <Button
              title={isGoing ? 'Going ✓' : 'Join'}
              variant={isGoing ? 'primary' : 'secondary'}
              onPress={(e) => {
                e.stopPropagation()
                // Always call onAction for immediate local state update
                if (onAction) {
                  onAction(event.id, 'going')
                }
                // Also update Supabase if user is authenticated
                if (user?.id && toggleGoing) {
                  toggleGoing()
                }
              }}
              disabled={isActionLoading}
              style={[
                styles.joinButton,
                isGoing ? styles.joinButtonActive : styles.joinButtonInactive,
              ]}
              textStyle={[
                styles.joinButtonText,
                isGoing ? styles.joinButtonTextActive : styles.joinButtonTextInactive,
              ]}
            />
          )}

          {!isOrganizer && event.requires_approval && !attendanceState?.isRequested && !isGoing && (
            <Button
              title="Request to Join"
              variant="secondary"
              onPress={(e) => {
                e.stopPropagation()
                // Always call onAction for immediate local state update
                if (onAction) {
                  onAction(event.id, 'request')
                }
                // Also update Supabase if user is authenticated
                if (user?.id && requestJoin) {
                  requestJoin()
                }
              }}
              disabled={isActionLoading}
              style={styles.joinButton}
              textStyle={styles.joinButtonText}
            />
          )}

          {!isOrganizer && (attendanceState?.isRequested || attendanceStatus === 'pending') && (
            <Button
              title="Request Pending"
              variant="secondary"
              disabled
              style={[styles.joinButton, styles.joinButtonPending]}
              textStyle={[styles.joinButtonText, styles.joinButtonTextPending]}
            />
          )}

          {!isOrganizer && event.is_paid && isFeatureEnabled('PAID_EVENTS') && (
            <Button
              title="Buy Ticket"
              variant="primary"
              onPress={(e) => {
                e.stopPropagation()
                onPress() // Navigate to detail page for ticket purchase
              }}
              style={styles.joinButton}
              textStyle={styles.joinButtonText}
            />
          )}
          {!isOrganizer && event.is_paid && !isFeatureEnabled('PAID_EVENTS') && (
            <Button
              title="Paid Event"
              variant="secondary"
              disabled
              style={[styles.joinButton, styles.joinButtonPending]}
              textStyle={[styles.joinButtonText, styles.joinButtonTextPending]}
            />
          )}
          </View>
        )}
      </AppCard>
      <ShareModal
        visible={showShareModal}
        content={{
          type: 'event',
          data: {
            id: event.id,
            title: event.title,
            location_name: event.location_name,
            location_address: event.location_address,
            start_at: event.start_at,
            image_url: event.image_url,
          },
        }}
        onClose={() => setShowShareModal(false)}
      />
    </>
  )
}


const createStyles = (theme) =>
  StyleSheet.create({
    card: {
      width: '100%',
      overflow: 'hidden',
    },
    cardContent: {
      overflow: 'hidden',
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
    },
    // Image section - clean, no overlays
    image: {
      width: '100%',
      height: hp(20), // Slightly smaller for Eventbrite style
      backgroundColor: theme.colors.backgroundSecondary,
    },
    imagePlaceholder: {
      width: '100%',
      height: hp(20),
      backgroundColor: theme.colors.accent + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Content below image - Eventbrite style
    contentContainer: {
      paddingHorizontal: wp(4),
      paddingTop: hp(1.5),
      paddingBottom: hp(2),
      backgroundColor: theme.colors.surface,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: hp(1),
      gap: wp(2),
    },
    title: {
      fontSize: theme.typography.sizes.xl,
      fontFamily: theme.typography.fontFamily.heading,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      flex: 1,
      lineHeight: hp(2.6),
    },
    actionIcons: {
      flexDirection: 'row',
      gap: wp(2),
      alignItems: 'center',
    },
    actionIconButton: {
      padding: hp(0.5),
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Details row - single line with date, time, location
    detailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(1.5),
      marginBottom: hp(1),
      flexWrap: 'wrap',
    },
    detailsText: {
      fontSize: theme.typography.sizes.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.textSecondary,
      marginLeft: wp(0.5),
    },
    detailsSeparator: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textTertiary,
      marginHorizontal: wp(0.5),
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: hp(0.5),
    },
    footerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(2),
      flexWrap: 'wrap',
    },
    priceBadge: {
      backgroundColor: theme.colors.warning + '15',
      borderWidth: 1,
      borderColor: theme.colors.warning,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.5),
      borderRadius: theme.radius.md,
    },
    priceText: {
      fontSize: theme.typography.sizes.sm,
      fontFamily: theme.typography.fontFamily.body,
      fontWeight: '600',
      color: theme.colors.warning,
    },
    freeBadge: {
      backgroundColor: theme.colors.success + '15',
      borderWidth: 1,
      borderColor: theme.colors.success,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.5),
      borderRadius: theme.radius.md,
    },
    freeText: {
      fontSize: theme.typography.sizes.sm,
      fontFamily: theme.typography.fontFamily.body,
      fontWeight: '600',
      color: theme.colors.success,
    },
    attendeesBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(1),
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    attendeesText: {
      fontSize: theme.typography.sizes.sm,
      fontFamily: theme.typography.fontFamily.body,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    goingBadge: {
      backgroundColor: theme.colors.accent + '15',
      borderWidth: 1,
      borderColor: theme.colors.accent,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.5),
      borderRadius: theme.radius.md,
    },
    goingText: {
      fontSize: theme.typography.sizes.sm,
      fontFamily: theme.typography.fontFamily.body,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    actionContainer: {
      paddingHorizontal: wp(4),
      paddingTop: hp(1),
      paddingBottom: hp(1.5),
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    joinButton: {
      width: '100%',
      paddingVertical: hp(1.2),
      borderRadius: theme.radius.lg,
      minHeight: hp(4.5),
    },
    joinButtonActive: {
      backgroundColor: theme.colors.accent,
      borderWidth: 0,
    },
    joinButtonInactive: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
    },
    joinButtonPending: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    joinButtonText: {
      fontSize: theme.typography.sizes.md,
      fontFamily: theme.typography.fontFamily.body,
      fontWeight: '700',
      textAlign: 'center',
    },
    joinButtonTextActive: {
      color: theme.colors.white,
    },
    joinButtonTextInactive: {
      color: theme.colors.accent,
    },
    joinButtonTextPending: {
      color: theme.colors.textSecondary,
    },
    manageButton: {
      backgroundColor: theme.colors.bondedPurple + '15',
      borderWidth: 1.5,
      borderColor: theme.colors.bondedPurple,
    },
    manageButtonText: {
      color: theme.colors.bondedPurple,
    },
  })
