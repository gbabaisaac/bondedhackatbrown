import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'

export default function CircleCard({
  topic,
  subtitle,
  totalParticipants = 0,
  activeRooms = 0,
  userAnswer = null,
  isLive = false,
  onPress,
  onSubmitAnswer,
}) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.95}
      onPress={userAnswer ? onPress : onSubmitAnswer}
    >
      <LinearGradient
        colors={isLive ? ['#8B5CF6', '#6366F1'] : ['#6B7280', '#4B5563']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Live pulse indicator */}
        {isLive && (
          <View style={styles.liveContainer}>
            <View style={styles.livePulse}>
              <View style={styles.livePulseInner} />
            </View>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        {/* Topic */}
        <View style={styles.topicContainer}>
          <Text style={styles.topicIcon}>🎙️</Text>
          <Text style={styles.topicTitle}>{topic}</Text>
        </View>

        {/* Stats */}
        {isLive && (
          <View style={styles.statsContainer}>
            <View style={styles.statBubble}>
              <Ionicons name="people" size={hp(2)} color="#FFFFFF" style={{ opacity: 0.9 }} />
              <Text style={styles.statText}>{totalParticipants}</Text>
            </View>
            <View style={styles.statBubble}>
              <Ionicons name="radio" size={hp(2)} color="#FFFFFF" style={{ opacity: 0.9 }} />
              <Text style={styles.statText}>{activeRooms}</Text>
            </View>
          </View>
        )}

        {/* User answer badge */}
        {userAnswer && (
          <View style={styles.answerBadge}>
            <Ionicons name="checkmark-circle" size={hp(2)} color="#10B981" />
            <Text style={styles.answerBadgeText}>Your answer submitted</Text>
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaContainer}>
          {userAnswer ? (
            <>
              <Ionicons name="headset" size={hp(2.4)} color="#FFFFFF" />
              <Text style={styles.ctaText}>Join the conversation</Text>
            </>
          ) : (
            <>
              <Ionicons name="create" size={hp(2.4)} color="#FFFFFF" />
              <Text style={styles.ctaText}>Share your take first</Text>
            </>
          )}
        </View>

        {/* Subtle time info */}
        <Text style={styles.timeText}>
          {isLive ? 'Happening now • Ends at 11:59 PM' : 'Opens today at 7:00 PM'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    marginHorizontal: wp(4),
    marginVertical: hp(1),
    borderRadius: theme.radius.xxl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  gradient: {
    padding: wp(6),
    paddingVertical: hp(3),
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  livePulse: {
    width: hp(2.5),
    height: hp(2.5),
    borderRadius: hp(1.25),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
  },
  livePulseInner: {
    width: hp(1.2),
    height: hp(1.2),
    borderRadius: hp(0.6),
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontSize: hp(1.5),
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.heading,
    letterSpacing: 1.2,
  },
  topicContainer: {
    marginBottom: hp(2.5),
  },
  topicIcon: {
    fontSize: hp(4),
    marginBottom: hp(1),
  },
  topicTitle: {
    fontSize: hp(2.6),
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.heading,
    lineHeight: hp(3.2),
    letterSpacing: -0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: wp(3),
    marginBottom: hp(2),
  },
  statBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.pill,
    gap: wp(1.5),
  },
  statText: {
    fontSize: hp(1.6),
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.body,
  },
  answerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.pill,
    gap: wp(1.5),
    marginBottom: hp(2),
  },
  answerBadgeText: {
    fontSize: hp(1.5),
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.body,
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: hp(1.5),
    borderRadius: theme.radius.xl,
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  ctaText: {
    fontSize: hp(1.8),
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.body,
  },
  timeText: {
    fontSize: hp(1.4),
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.7,
    textAlign: 'center',
  },
})
