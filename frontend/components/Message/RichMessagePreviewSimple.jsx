/**
 * Instagram-Style Rich Message Preview - Wide & Compact
 */

import { useRouter } from 'expo-router'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import { useAppTheme } from '../../app/theme'
import { hp, wp } from '../../helpers/common'

const RichMessagePreview = ({ message, isOwn }) => {
  const theme = useAppTheme()
  const router = useRouter()
  
  // Only render if we have metadata with shareType
  if (!message.metadata || !message.metadata.shareType) {
    return null
  }
  
  const handlePress = () => {
    const shareData = message.metadata.shareData || {}
    const actualData = shareData.data || shareData
    
    console.log('🔗 Rich preview clicked:', {
      shareType: message.metadata.shareType,
      shareData: shareData,
      actualData: actualData,
      postId: actualData?.id,
      forumId: actualData?.forumId || actualData?.forum_id,
      metadata: message.metadata
    })
    
    // Navigate based on share type
    switch (message.metadata.shareType) {
      case 'event':
        const eventId = actualData?.id
        console.log('🎉 Navigating to event:', eventId)
        if (eventId) {
          router.push(`/events/${eventId}`)
        } else {
          console.warn('⚠️ No event ID found')
        }
        break
      
      case 'post':
        const postId = actualData?.id
        const forumId = actualData?.forumId || actualData?.forum_id
        console.log('💬 Navigating to post:', { postId, forumId })
        if (postId && forumId) {
          router.push(`/forum/${forumId}?post=${postId}`)
        } else if (postId) {
          console.log('💬 Trying forum search for post:', postId)
          router.push(`/forum?post=${postId}`)
        } else {
          console.warn('⚠️ No post ID found')
        }
        break
      
      case 'profile':
        const profileId = actualData?.id
        console.log('👤 Navigating to profile:', profileId)
        if (profileId) {
          router.push(`/profile/${profileId}`)
        } else {
          console.warn('⚠️ No profile ID found')
        }
        break
      
      case 'organization':
      case 'org':
        const orgId = actualData?.id
        console.log('🏢 Navigating to org:', orgId)
        if (orgId) {
          router.push(`/org/${orgId}`)
        } else {
          console.warn('⚠️ No org ID found')
        }
        break
      
      default:
        console.log('❓ Unknown share type:', message.metadata.shareType)
    }
  }
  
  const getIconAndLabel = () => {
    switch (message.metadata.shareType) {
      case 'event': return { icon: '🎉', label: 'EVENT' }
      case 'post': return { icon: '💬', label: 'POST' }
      case 'profile': return { icon: '👤', label: 'PROFILE' }
      case 'organization':
      case 'org': return { icon: '🏢', label: 'ORGANIZATION' }
      default: return { icon: '📄', label: 'CONTENT' }
    }
  }
  
  const renderPostPreview = () => {
    const shareData = message.metadata.shareData || {}
    const actualData = shareData.data || shareData
    
    return (
      <TouchableOpacity style={styles.previewCard} onPress={handlePress}>
        {/* Header */}
        <View style={styles.previewHeader}>
          <Text style={styles.previewIcon}>💬</Text>
          <Text style={styles.previewLabel}>POST</Text>
        </View>
        
        {/* Content - Horizontal Layout */}
        <View style={styles.previewContent}>
          {/* Thumbnail */}
          {actualData?.image_url ? (
            <Image 
              source={{ uri: actualData.image_url }}
              style={styles.postThumbnail}
            />
          ) : (
            <View style={[styles.postThumbnail, styles.postThumbnailFallback]}>
              <Text style={styles.fallbackIcon}>💬</Text>
            </View>
          )}
          
          {/* Text Content */}
          <View style={styles.postInfo}>
            <Text style={styles.postTitle} numberOfLines={3}>
              {actualData?.title || 'Post'}
            </Text>
            
            {/* Post body content - much more readable */}
            {(actualData?.body || actualData?.content) && (
              <Text style={styles.postBody} numberOfLines={4}>
                {actualData.body || actualData.content || ''}
              </Text>
            )}
            
            <View style={styles.postMetadata}>
              <Text style={styles.metadataText}>
                {actualData?.forum_name || 'Forum'}
              </Text>
              <Text style={styles.metadataDot}>•</Text>
              <Text style={styles.metadataText}>
                💬 {actualData?.comments_count || 0}
              </Text>
              {(actualData?.upvotes_count || 0) > 0 && (
                <>
                  <Text style={styles.metadataDot}>•</Text>
                  <Text style={styles.metadataText}>
                    ⬆️ {actualData.upvotes_count}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }
  
  const renderEventPreview = () => {
    const shareData = message.metadata.shareData || {}
    const actualData = shareData.data || shareData
    
    return (
      <TouchableOpacity style={styles.previewCard} onPress={handlePress}>
        {/* Header */}
        <View style={styles.previewHeader}>
          <Text style={styles.previewIcon}>🎉</Text>
          <Text style={styles.previewLabel}>EVENT</Text>
        </View>
        
        {/* Content - Horizontal Layout */}
        <View style={styles.previewContent}>
          {/* Thumbnail */}
          {actualData?.image_url ? (
            <Image 
              source={{ uri: actualData.image_url }}
              style={styles.eventThumbnail}
            />
          ) : (
            <View style={[styles.eventThumbnail, styles.eventThumbnailFallback]}>
              <Text style={styles.fallbackIcon}>🎉</Text>
            </View>
          )}
          
          {/* Text Content */}
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {actualData?.title || 'Event'}
            </Text>
            
            <View style={styles.eventMetadata}>
              <View style={styles.eventMetadataRow}>
                <Text style={styles.metadataIcon}>📅</Text>
                <Text style={styles.metadataText}>
                  {actualData?.start_at ? new Date(actualData.start_at).toLocaleDateString() : 'Date'}
                </Text>
              </View>
              <View style={styles.eventMetadataRow}>
                <Text style={styles.metadataIcon}>📍</Text>
                <Text style={styles.metadataText}>
                  {actualData?.location_name || actualData?.location || 'Location'}
                </Text>
              </View>
              <View style={styles.eventMetadataRow}>
                <Text style={styles.metadataIcon}>👥</Text>
                <Text style={styles.metadataText}>
                  {actualData?.attendee_count || 0} going
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }
  
  const renderProfilePreview = () => {
    const shareData = message.metadata.shareData || {}
    const actualData = shareData.data || shareData
    
    return (
      <TouchableOpacity style={styles.previewCard} onPress={handlePress}>
        {/* Header */}
        <View style={styles.previewHeader}>
          <Text style={styles.previewIcon}>👤</Text>
          <Text style={styles.previewLabel}>PROFILE</Text>
        </View>
        
        {/* Content - Horizontal Layout */}
        <View style={styles.previewContent}>
          {/* Avatar */}
          <Image 
            source={{ 
              uri: actualData?.avatar_url || undefined 
            }} 
            style={styles.profileAvatar}
          />
          
          {/* Text Content */}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {actualData?.full_name || actualData?.username || 'User'}
            </Text>
            <Text style={styles.profileUsername}>
              @{actualData?.username || 'user'}
            </Text>
            <View style={styles.profileMetadata}>
              <Text style={styles.metadataText}>
                {actualData?.major || 'Student'} '{actualData?.graduation_year?.toString().slice(-2) || '??'}
              </Text>
              {(actualData?.mutual_friends || 0) > 0 && (
                <>
                  <Text style={styles.metadataDot}>•</Text>
                  <Text style={styles.metadataText}>
                    🤝 {actualData.mutual_friends} mutual
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }
  
  const renderOrgPreview = () => {
    const shareData = message.metadata.shareData || {}
    const actualData = shareData.data || shareData
    
    return (
      <TouchableOpacity style={styles.previewCard} onPress={handlePress}>
        {/* Header */}
        <View style={styles.previewHeader}>
          <Text style={styles.previewIcon}>🏢</Text>
          <Text style={styles.previewLabel}>ORGANIZATION</Text>
        </View>
        
        {/* Content - Horizontal Layout */}
        <View style={styles.previewContent}>
          {/* Logo */}
          {actualData?.logo_url ? (
            <Image 
              source={{ uri: actualData.logo_url }}
              style={styles.orgThumbnail}
            />
          ) : (
            <View style={[styles.orgThumbnail, styles.orgThumbnailFallback]}>
              <Text style={styles.fallbackIcon}>🏢</Text>
            </View>
          )}
          
          {/* Text Content */}
          <View style={styles.orgInfo}>
            <Text style={styles.orgName} numberOfLines={2}>
              {actualData?.name || 'Organization'}
            </Text>
            <View style={styles.orgMetadata}>
              <Text style={styles.metadataText}>
                {actualData?.category || 'Organization'}
              </Text>
              <Text style={styles.metadataDot}>•</Text>
              <Text style={styles.metadataText}>
                👥 {actualData?.member_count || 0} members
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }
  
  const renderPreview = () => {
    const shareType = message.metadata?.shareType || message.metadata?.type
    
    switch (shareType) {
      case 'post_share':
      case 'post':
        return renderPostPreview()
      case 'event_share':
      case 'event':
        return renderEventPreview()
      case 'profile_share':
      case 'profile':
        return renderProfilePreview()
      case 'org_share':
      case 'organization':
      case 'org':
        return renderOrgPreview()
      default:
        return null
    }
  }
  
  return (
    <View style={styles.container}>
      {!isOwn && (
        <Text style={styles.shareHeader}>
          {message.sender?.username || 'Someone'} shared a {message.metadata.shareType}
        </Text>
      )}
      
      {renderPreview()}
    </View>
  )
}

const styles = {
  container: {
    marginVertical: hp(0.5),
  },
  shareHeader: {
    fontSize: hp(1.4),
    color: '#666',
    marginBottom: hp(0.5),
    fontStyle: 'italic',
  },
  
  // Base card
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: hp(0.5),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // Header
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  previewIcon: {
    fontSize: wp(4),
  },
  previewLabel: {
    fontSize: hp(1.3),
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  
  // Content - Horizontal Layout
  previewContent: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Changed to flex-start for better text alignment
    gap: wp(3),
    padding: hp(2),
    paddingBottom: hp(1.5), // Extra bottom padding
  },
  
  // Post specific
  postThumbnail: {
    width: wp(15),
    height: wp(15),
    borderRadius: wp(2),
    backgroundColor: '#F0F0F0',
  },
  postThumbnailFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  postInfo: {
    flex: 1,
  },
  postTitle: {
    fontSize: hp(2),
    fontWeight: '600',
    color: '#000',
    lineHeight: hp(2.6),
    marginBottom: hp(0.8),
  },
  postBody: {
    fontSize: hp(1.7),
    color: '#333',
    lineHeight: hp(2.2),
    marginBottom: hp(0.8),
  },
  postMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  
  // Event specific
  eventThumbnail: {
    width: wp(20),
    height: wp(20),
    borderRadius: wp(2),
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  eventThumbnailFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: hp(1.9),
    fontWeight: '600',
    color: '#000',
    lineHeight: hp(2.5),
    marginBottom: hp(0.8),
  },
  eventMetadata: {
    gap: hp(0.5),
  },
  eventMetadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  
  // Profile specific
  profileAvatar: {
    width: wp(15),
    height: wp(15),
    borderRadius: wp(7.5),
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#F0F0F0',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: hp(1.9),
    fontWeight: '600',
    color: '#000',
    marginBottom: hp(0.3),
  },
  profileUsername: {
    fontSize: hp(1.5),
    color: '#666',
    marginBottom: hp(0.5),
  },
  profileMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  
  // Organization specific
  orgThumbnail: {
    width: wp(12.5),
    height: wp(12.5),
    borderRadius: wp(2),
    backgroundColor: '#F0F0F0',
  },
  orgThumbnailFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: hp(1.9),
    fontWeight: '600',
    color: '#000',
    lineHeight: hp(2.5),
    marginBottom: hp(0.8),
  },
  orgMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  
  // Common
  fallbackIcon: {
    fontSize: wp(5),
  },
  metadataText: {
    fontSize: hp(1.5),
    color: '#999',
  },
  metadataIcon: {
    fontSize: wp(3),
  },
  metadataDot: {
    fontSize: hp(1.5),
    color: '#DDD',
    marginHorizontal: wp(1),
  },
}

export default RichMessagePreview
