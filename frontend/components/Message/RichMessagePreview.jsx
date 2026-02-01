/**
 * Rich Message Previews - Professional Design System
 * Based on modern messaging apps like iMessage, Instagram DMs, Slack
 */

import { useRouter } from 'expo-router'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAppTheme } from '../../app/theme'
import { hp, wp } from '../../helpers/common'
import { useProfileModal } from '../../contexts/ProfileModalContext'
import { useOrgModal } from '../../contexts/OrgModalContext'

// Base preview card component
const PreviewCard = ({ children, onPress, style }) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  
  return (
    <TouchableOpacity 
      style={[styles.previewCard, style]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  )
}

// Event Share Preview
export const EventSharePreview = ({ message, isOwn }) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  
  const event = message.metadata
  const handlePress = () => {
    if (event.event_id) {
      router.push(`/events/${event.event_id}`)
    }
  }
  
  return (
    <View style={styles.messageContainer}>
      {!isOwn && (
        <Text style={styles.shareHeader}>
          🎉 {message.sender?.username || 'Someone'} shared an event
        </Text>
      )}
      
      <PreviewCard onPress={handlePress} style={styles.eventCard}>
        <View style={styles.previewCardContent}>
          {event.image_url && (
            <Image 
              source={{ uri: event.image_url }} 
              style={styles.previewThumbnail}
            />
          )}
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {event.title || 'Event'}
            </Text>
            <Text style={styles.previewSubtitle} numberOfLines={1}>
              {event.start_at ? new Date(event.start_at).toLocaleDateString() : 'Date'}
            </Text>
            <View style={styles.previewMetadata}>
              <Text style={styles.metadataText}>📍 {event.location_name || 'Location'}</Text>
              <Text style={styles.metadataText}>👥 {event.attendee_count || 0} going</Text>
            </View>
          </View>
        </View>
        <View style={styles.previewAction}>
          <Text style={styles.actionText}>View Event</Text>
        </View>
      </PreviewCard>
    </View>
  )
}

// Forum Post Share Preview
export const PostSharePreview = ({ message, isOwn }) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  
  const post = message.metadata
  const handlePress = () => {
    if (post.post_id && post.forum_id) {
      router.push(`/forum/${post.forum_id}?post=${post.post_id}`)
    }
  }
  
  return (
    <View style={styles.messageContainer}>
      {!isOwn && (
        <Text style={styles.shareHeader}>
          📝 {message.sender?.username || 'Someone'} shared a post
        </Text>
      )}
      
      <PreviewCard onPress={handlePress} style={styles.postCard}>
        <View style={styles.previewCardContent}>
          {post.image_url && (
            <Image 
              source={{ uri: post.image_url }} 
              style={styles.previewThumbnail}
            />
          )}
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {post.title || 'Post'}
            </Text>
            <Text style={styles.previewSubtitle} numberOfLines={2}>
              {post.body || post.content || ''}
            </Text>
            <View style={styles.previewMetadata}>
              <Text style={styles.metadataText}>{post.forum_name || 'Forum'}</Text>
              <Text style={styles.metadataText}>💬 {post.comments_count || 0}</Text>
              <Text style={styles.metadataText}>⬆️ {post.upvotes_count || 0}</Text>
            </View>
          </View>
        </View>
        <View style={styles.previewAction}>
          <Text style={styles.actionText}>View Post</Text>
        </View>
      </PreviewCard>
    </View>
  )
}

// Profile Share Preview
export const ProfileSharePreview = ({ message, isOwn }) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const { openProfile } = useProfileModal()
  
  const profile = message.metadata
  const handlePress = () => {
    if (profile.user_id) {
      openProfile(profile.user_id)
      return
    }
    if (profile.id) {
      openProfile(profile.id)
      return
    }
  }
  
  return (
    <View style={styles.messageContainer}>
      {!isOwn && (
        <Text style={styles.shareHeader}>
          👤 {message.sender?.username || 'Someone'} shared a profile
        </Text>
      )}
      
      <PreviewCard onPress={handlePress} style={styles.profileCard}>
        <View style={styles.previewCardContent}>
          <Image 
            source={{ 
              uri: profile.avatar_url || undefined 
            }} 
            style={[styles.previewThumbnail, styles.profileAvatar]}
          />
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {profile.full_name || profile.username || 'User'}
            </Text>
            <Text style={styles.previewSubtitle} numberOfLines={1}>
              {profile.major} '{profile.graduation_year?.toString().slice(-2) || '??'}
            </Text>
            <View style={styles.previewMetadata}>
              <Text style={styles.metadataText}>@{profile.username || 'user'}</Text>
              {profile.mutual_friends > 0 && (
                <Text style={styles.metadataText}>🤝 {profile.mutual_friends} mutual</Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.previewAction}>
          <Text style={styles.actionText}>View Profile</Text>
        </View>
      </PreviewCard>
    </View>
  )
}

// Organization Share Preview
export const OrgSharePreview = ({ message, isOwn }) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const { openOrg } = useOrgModal()
  
  const org = message.metadata
  const handlePress = () => {
    if (org.org_id) {
      openOrg(org.org_id)
      return
    }
    if (org.id) {
      openOrg(org.id)
      return
    }
  }
  
  return (
    <View style={styles.messageContainer}>
      {!isOwn && (
        <Text style={styles.shareHeader}>
          🏢 {message.sender?.username || 'Someone'} shared an organization
        </Text>
      )}
      
      <PreviewCard onPress={handlePress} style={styles.orgCard}>
        <View style={styles.previewCardContent}>
          <Image 
            source={{ uri: org.logo_url || undefined }} 
            style={styles.previewThumbnail}
          />
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {org.name || 'Organization'}
            </Text>
            <Text style={styles.previewSubtitle} numberOfLines={1}>
              {org.category || 'Organization'}
            </Text>
            <View style={styles.previewMetadata}>
              <Text style={styles.metadataText}>👥 {org.member_count || 0} members</Text>
            </View>
          </View>
        </View>
        <View style={styles.previewAction}>
          <Text style={styles.actionText}>View Organization</Text>
        </View>
      </PreviewCard>
    </View>
  )
}

// Main Rich Message Renderer
const RichMessagePreview = ({ message, isOwn }) => {
  const messageType = message.message_type || message.metadata?.shareType
  
  switch (messageType) {
    case 'event_share':
    case 'event':
      return <EventSharePreview message={message} isOwn={isOwn} />
    
    case 'post_share':
    case 'post':
      return <PostSharePreview message={message} isOwn={isOwn} />
    
    case 'profile_share':
    case 'profile':
      return <ProfileSharePreview message={message} isOwn={isOwn} />
    
    case 'org_share':
    case 'organization':
    case 'org':
      return <OrgSharePreview message={message} isOwn={isOwn} />
    
    default:
      return null
  }
}

export default RichMessagePreview

const createStyles = (theme) => StyleSheet.create({
  messageContainer: {
    marginVertical: hp(0.5),
  },
  shareHeader: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    marginBottom: hp(0.5),
    fontStyle: 'italic',
  },
  
  // Base preview card
  previewCard: {
    backgroundColor: theme.colors.cardBackground || '#F8F8F8',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    maxWidth: '100%',
  },
  
  previewCardContent: {
    padding: hp(1.2),
    flexDirection: 'row',
    gap: wp(3),
  },
  
  previewThumbnail: {
    width: wp(15),
    height: wp(15),
    borderRadius: 8,
    backgroundColor: theme.colors.border || '#e5e7eb',
  },
  
  profileAvatar: {
    borderRadius: wp(7.5), // Circular for profiles
    borderWidth: 2,
    borderColor: theme.colors.bondedPurple || '#007AFF',
  },
  
  previewInfo: {
    flex: 1,
    minWidth: 0,
  },
  
  previewTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.2),
  },
  
  previewSubtitle: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    marginBottom: hp(0.4),
  },
  
  previewMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  
  metadataText: {
    fontSize: hp(1.3),
    color: theme.colors.textTertiary || '#999',
  },
  
  previewAction: {
    padding: hp(1),
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
  },
  
  actionText: {
    fontSize: hp(1.5),
    fontWeight: '600',
    color: theme.colors.bondedPurple || '#007AFF',
  },
  
  // Event-specific styling
  eventCard: {
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
  },
  
  // Post-specific styling
  postCard: {
    backgroundColor: '#fafafa',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.bondedPurple || '#007AFF',
  },
  
  // Profile-specific styling
  profileCard: {
    backgroundColor: 'rgba(245, 247, 250, 1)',
  },
})
