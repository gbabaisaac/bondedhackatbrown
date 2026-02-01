import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'
import { useClubsContext } from '../../contexts/ClubsContext'
import { useEventsContext } from '../../contexts/EventsContext'
import { useOrgModal } from '../../contexts/OrgModalContext'
import ShareModal from '../ShareModal'
import { formatDate, formatTime } from '../../utils/dateFormatters'

export default function EventPost({ event, forumId }) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const { rsvpToEvent, getUserRSVP } = useEventsContext()
  const { getClub } = useClubsContext()
  const { openOrg } = useOrgModal()
  const [showShareModal, setShowShareModal] = useState(false)

  // Mock current user - replace with real auth
  const currentUserId = 'user-123'
  const userRSVP = getUserRSVP(event.id, currentUserId)
  
  // Get club info if event is from a club
  const club = event.clubId ? getClub(event.clubId) : null

  const handleRSVP = (status) => {
    rsvpToEvent(event.id, currentUserId, status)
  }

  const attendeesCount = event.attendees?.length || 0
  const interestedCount = event.interested?.length || 0

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/events/${event.id}`)}
      activeOpacity={0.9}
    >
      {/* Cover Image or Placeholder */}
      {event.coverImage ? (
        <Image source={{ uri: event.coverImage }} style={styles.coverImage} />
      ) : (
        <View style={styles.coverImagePlaceholder}>
          <Ionicons name="calendar" size={hp(4)} color={theme.colors.bondedPurple} />
        </View>
      )}

      {/* Event Info */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.eventBadge}>
              <Text style={styles.eventBadgeText}>EVENT</Text>
            </View>
            <Text style={styles.category}>{event.category}</Text>
          </View>
          {club && (
            <TouchableOpacity
              style={styles.clubBadge}
              onPress={(e) => {
                e.stopPropagation()
                openOrg(event.clubId)
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="people" size={hp(1.4)} color={theme.colors.bondedPurple} />
              <Text style={styles.clubBadgeText}>{club.name}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        {/* Description */}
        {event.description && (
          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>
        )}

        {/* Date & Location */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons
              name="calendar-outline"
              size={hp(1.8)}
              color={theme.colors.softBlack}
              style={{ opacity: 0.6 }}
            />
            <Text style={styles.detailText}>
              {formatDate(event.startDate)} at {formatTime(event.startDate)}
            </Text>
          </View>
          {event.location && (
            <View style={styles.detailItem}>
              <Ionicons
                name="location-outline"
                size={hp(1.8)}
                color={theme.colors.softBlack}
                style={{ opacity: 0.6 }}
              />
              <Text style={styles.detailText} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons
              name="checkmark-circle"
              size={hp(1.6)}
              color={theme.colors.bondedPurple}
            />
            <Text style={styles.statText}>{attendeesCount} going</Text>
          </View>
          {interestedCount > 0 && (
            <View style={styles.statItem}>
              <Ionicons
                name="heart-outline"
                size={hp(1.6)}
                color={theme.colors.softBlack}
                style={{ opacity: 0.6 }}
              />
              <Text style={styles.statText}>{interestedCount} interested</Text>
            </View>
          )}
        </View>

        {/* RSVP Buttons */}
        <View style={styles.rsvpRow}>
          {userRSVP === 'going' ? (
            <TouchableOpacity
              style={styles.rsvpButtonGoing}
              onPress={(e) => {
                e.stopPropagation()
                handleRSVP(null)
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={hp(1.8)} color={theme.colors.white} />
              <Text style={styles.rsvpButtonText}>Going</Text>
            </TouchableOpacity>
          ) : userRSVP === 'interested' ? (
            <>
              <TouchableOpacity
                style={styles.rsvpButtonInterestedActive}
                onPress={(e) => {
                  e.stopPropagation()
                  handleRSVP(null)
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="heart" size={hp(1.8)} color={theme.colors.bondedPurple} />
                <Text style={styles.rsvpButtonTextInterested}>Interested</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rsvpButtonGoing}
                onPress={(e) => {
                  e.stopPropagation()
                  handleRSVP('going')
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.rsvpButtonText}>I'm Going</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.rsvpButtonInterested}
                onPress={(e) => {
                  e.stopPropagation()
                  handleRSVP('interested')
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="heart-outline"
                  size={hp(1.8)}
                  color={theme.colors.bondedPurple}
                />
                <Text style={styles.rsvpButtonTextInterested}>Interested</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rsvpButtonGoing}
                onPress={(e) => {
                  e.stopPropagation()
                  handleRSVP('going')
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.rsvpButtonText}>I'm Going</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={(e) => {
              e.stopPropagation()
              setShowShareModal(true)
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={hp(1.8)} color={theme.colors.softBlack} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal}
        content={{
          type: 'event',
          data: event,
        }}
        onClose={() => setShowShareModal(false)}
      />
    </TouchableOpacity>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    marginBottom: hp(1.5),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(164, 92, 255, 0.08)',
  },
  coverImage: {
    width: '100%',
    height: hp(12),
    resizeMode: 'cover',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: hp(12),
    backgroundColor: theme.colors.bondedPurple + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: wp(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    flex: 1,
  },
  clubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    backgroundColor: theme.colors.bondedPurple + '15',
    borderRadius: theme.radius.pill,
  },
  clubBadgeText: {
    fontSize: hp(1.2),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.bondedPurple,
  },
  eventBadge: {
    backgroundColor: theme.colors.bondedPurple,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: theme.radius.pill,
  },
  eventBadgeText: {
    fontSize: hp(1),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
    color: theme.colors.white,
    letterSpacing: 0.5,
  },
  category: {
    fontSize: hp(1.2),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
    opacity: 0.7,
  },
  title: {
    fontSize: hp(2.2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.8),
  },
  description: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.8,
    marginBottom: hp(1),
    lineHeight: hp(2.2),
  },
  detailsRow: {
    gap: hp(0.8),
    marginBottom: hp(1.5),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  detailText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: wp(4),
    marginBottom: hp(1.5),
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  statText: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: wp(2),
  },
  rsvpButtonGoing: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bondedPurple,
    paddingVertical: hp(1.2),
    borderRadius: theme.radius.xl,
    gap: wp(1.5),
  },
  rsvpButtonInterested: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.bondedPurple,
    paddingVertical: hp(1.2),
    borderRadius: theme.radius.xl,
    gap: wp(1.5),
  },
  rsvpButtonInterestedActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bondedPurple + '15',
    borderWidth: 2,
    borderColor: theme.colors.bondedPurple,
    paddingVertical: hp(1.2),
    borderRadius: theme.radius.xl,
    gap: wp(1.5),
  },
  rsvpButtonText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
    color: theme.colors.white,
  },
  rsvpButtonTextInterested: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
    color: theme.colors.bondedPurple,
  },
  shareButton: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

