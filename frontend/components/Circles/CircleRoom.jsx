import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'

// Speaker Avatar Component (Twitter Spaces style)
const SpeakerAvatar = ({ speaker, isAnonymous, isSpeaking = true }) => {
  const initial = isAnonymous ? '🎭' : speaker.name?.charAt(0)?.toUpperCase()

  return (
    <View style={styles.avatarWrapper}>
      {/* Outer ring (speaking indicator) */}
      {isSpeaking && (
        <View style={styles.speakingRing}>
          <View style={styles.speakingRingInner} />
        </View>
      )}

      {/* Avatar */}
      <LinearGradient
        colors={['#8B5CF6', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}
      >
        <Text style={styles.avatarText}>{initial}</Text>
      </LinearGradient>

      {/* Name label */}
      <Text style={styles.speakerName} numberOfLines={1}>
        {isAnonymous ? 'Anon' : speaker.name}
      </Text>

      {/* Mic indicator */}
      {isSpeaking && (
        <View style={styles.micBadge}>
          <Ionicons name="mic" size={hp(1.2)} color="#FFFFFF" />
        </View>
      )}
    </View>
  )
}

// Listener Avatar Component (smaller, no ring)
const ListenerAvatar = ({ name, hasChangedMind }) => {
  const isAnon = name === 'Anon'
  const initial = isAnon ? '🎭' : name?.charAt(0)?.toUpperCase()

  return (
    <View style={styles.listenerWrapper}>
      <View style={styles.listenerAvatar}>
        <Text style={styles.listenerAvatarText}>{initial}</Text>
      </View>
      {hasChangedMind && (
        <View style={styles.changeBadge}>
          <Ionicons name="swap-vertical" size={hp(1)} color="#10B981" />
        </View>
      )}
    </View>
  )
}

export default function CircleRoom({
  visible,
  topic,
  roomNumber,
  totalRooms,
  userViewpoint,
  onClose,
  onUpdateViewpoint,
}) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  // Mock data
  const mockSpeakers = [
    { id: '1', name: 'Sarah Chen', isAnonymous: false },
    { id: '2', name: 'Anon', isAnonymous: true },
    { id: '3', name: 'Mike Johnson', isAnonymous: false },
  ]

  const mockListeners = Array.from({ length: 38 }).map((_, i) => ({
    id: `listener-${i}`,
    name: i % 3 === 0 ? 'Anon' : `User${i}`,
    hasChangedMind: Math.random() > 0.8,
  }))

  const handleLeave = () => {
    Alert.alert(
      'Leave Circle?',
      'Are you sure you want to leave this conversation?',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onClose },
      ]
    )
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleLeave}>
      <LinearGradient
        colors={['#1F2937', '#111827']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleLeave} style={styles.closeButton}>
              <Ionicons name="chevron-down" size={hp(3)} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.roomInfo}>
              <Text style={styles.roomNumber}>Circle {roomNumber} of {totalRooms}</Text>
            </View>
            <TouchableOpacity style={styles.menuButton}>
              <Ionicons name="ellipsis-horizontal" size={hp(2.5)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Topic */}
            <View style={styles.topicSection}>
              <Text style={styles.topicIcon}>🎙️</Text>
              <Text style={styles.topicText}>{topic}</Text>
            </View>

            {/* Speakers Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SPEAKING</Text>
              <View style={styles.speakersGrid}>
                {mockSpeakers.map(speaker => (
                  <SpeakerAvatar
                    key={speaker.id}
                    speaker={speaker}
                    isAnonymous={speaker.isAnonymous}
                    isSpeaking={true}
                  />
                ))}
              </View>
            </View>

            {/* Listeners Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                LISTENING · {mockListeners.length}
              </Text>
              <View style={styles.listenersGrid}>
                {mockListeners.slice(0, 24).map(listener => (
                  <ListenerAvatar
                    key={listener.id}
                    name={listener.name}
                    hasChangedMind={listener.hasChangedMind}
                  />
                ))}
                {mockListeners.length > 24 && (
                  <View style={styles.moreListeners}>
                    <Text style={styles.moreListenersText}>
                      +{mockListeners.length - 24}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Your Viewpoint Card */}
            <View style={styles.viewpointCard}>
              <View style={styles.viewpointHeader}>
                <Ionicons name="bulb" size={hp(2)} color="#F59E0B" />
                <Text style={styles.viewpointTitle}>Your Take</Text>
              </View>

              <View style={styles.viewpointContent}>
                <Text style={styles.viewpointLabel}>Initial opinion:</Text>
                <Text style={styles.viewpointText}>
                  "{userViewpoint?.initial?.answer}"
                </Text>

                <View style={styles.confidenceBar}>
                  <View
                    style={[
                      styles.confidenceFill,
                      { width: `${userViewpoint?.initial?.confidence || 50}%` },
                    ]}
                  />
                </View>
                <Text style={styles.confidenceLabel}>
                  {userViewpoint?.initial?.confidence || 50}% confident
                </Text>
              </View>

              <TouchableOpacity
                style={styles.updateButton}
                onPress={() => setShowUpdateModal(true)}
              >
                <Ionicons name="refresh-circle" size={hp(2)} color="#8B5CF6" />
                <Text style={styles.updateButtonText}>Update my viewpoint</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.raiseHandButton}>
              <Ionicons name="hand-right" size={hp(2.8)} color="#FFFFFF" />
              <Text style={styles.raiseHandText}>Request to speak</Text>
              <View style={styles.queueBadge}>
                <Text style={styles.queueText}>5</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionButton}>
                <Ionicons name="share-outline" size={hp(2.2)} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionButton}>
                <Ionicons name="thumbs-up-outline" size={hp(2.2)} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  closeButton: {
    width: hp(4),
    height: hp(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomInfo: {
    flex: 1,
    alignItems: 'center',
  },
  roomNumber: {
    fontSize: hp(1.5),
    fontWeight: '600',
    color: '#9CA3AF',
    fontFamily: theme.typography.fontFamily.body,
  },
  menuButton: {
    width: hp(4),
    height: hp(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: wp(6),
    paddingBottom: hp(3),
  },
  topicSection: {
    alignItems: 'center',
    paddingVertical: hp(3),
  },
  topicIcon: {
    fontSize: hp(5),
    marginBottom: hp(1.5),
  },
  topicText: {
    fontSize: hp(2.2),
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.heading,
    textAlign: 'center',
    lineHeight: hp(2.8),
    paddingHorizontal: wp(4),
  },
  section: {
    marginBottom: hp(4),
  },
  sectionTitle: {
    fontSize: hp(1.4),
    fontWeight: '700',
    color: '#9CA3AF',
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(2),
    letterSpacing: 1,
  },
  speakersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: wp(6),
  },
  avatarWrapper: {
    alignItems: 'center',
    width: wp(22),
    position: 'relative',
  },
  speakingRing: {
    position: 'absolute',
    top: -4,
    left: '50%',
    marginLeft: -hp(5.5),
    width: hp(11),
    height: hp(11),
    borderRadius: hp(5.5),
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakingRingInner: {
    width: hp(10.2),
    height: hp(10.2),
    borderRadius: hp(5.1),
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  avatar: {
    width: hp(9),
    height: hp(9),
    borderRadius: hp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  avatarText: {
    fontSize: hp(3.5),
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.heading,
  },
  speakerName: {
    fontSize: hp(1.5),
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(0.8),
    textAlign: 'center',
  },
  micBadge: {
    position: 'absolute',
    bottom: hp(2.5),
    right: wp(5),
    width: hp(2.8),
    height: hp(2.8),
    borderRadius: hp(1.4),
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  listenersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
  },
  listenerWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  listenerAvatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenerAvatarText: {
    fontSize: hp(1.8),
    color: '#9CA3AF',
    fontWeight: '600',
  },
  changeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: hp(1.8),
    height: hp(1.8),
    borderRadius: hp(0.9),
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreListeners: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreListenersText: {
    fontSize: hp(1.3),
    color: '#9CA3AF',
    fontWeight: '700',
  },
  viewpointCard: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: theme.radius.xl,
    padding: wp(5),
    marginTop: hp(2),
  },
  viewpointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  viewpointTitle: {
    fontSize: hp(1.7),
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.heading,
  },
  viewpointContent: {
    marginBottom: hp(2),
  },
  viewpointLabel: {
    fontSize: hp(1.4),
    color: '#9CA3AF',
    fontFamily: theme.typography.fontFamily.body,
    marginBottom: hp(0.5),
  },
  viewpointText: {
    fontSize: hp(1.7),
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.body,
    fontStyle: 'italic',
    lineHeight: hp(2.4),
    marginBottom: hp(1.5),
  },
  confidenceBar: {
    height: hp(0.6),
    backgroundColor: '#374151',
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    marginBottom: hp(0.5),
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: theme.radius.sm,
  },
  confidenceLabel: {
    fontSize: hp(1.3),
    color: '#9CA3AF',
    fontFamily: theme.typography.fontFamily.body,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingVertical: hp(1.2),
    borderRadius: theme.radius.lg,
    gap: wp(2),
  },
  updateButtonText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: '#A78BFA',
    fontFamily: theme.typography.fontFamily.body,
  },
  bottomContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
  },
  raiseHandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: hp(1.6),
    borderRadius: theme.radius.xl,
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  raiseHandText: {
    fontSize: hp(1.8),
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.body,
  },
  queueBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: theme.radius.pill,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    marginLeft: wp(2),
  },
  queueText: {
    fontSize: hp(1.3),
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.body,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp(4),
  },
  quickActionButton: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
