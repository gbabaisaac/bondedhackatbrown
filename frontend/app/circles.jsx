import React, { useState } from 'react'
import { Alert, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppTheme } from './theme'
import { hp, wp } from '../helpers/common'
import AppTopBar from '../components/AppTopBar'
import BottomNav from '../components/BottomNav'
import CircleCard from '../components/Circles/CircleCard'
import PreAnswerModal from '../components/Circles/PreAnswerModal'
import CircleRoom from '../components/Circles/CircleRoom'
import { useCirclesContext } from '../contexts/CirclesContext'
import { getFriendlyErrorMessage } from '../utils/userFacingErrors'
import { isFeatureEnabled } from '../utils/featureGates'

export default function Circles() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  if (!isFeatureEnabled('CIRCLES')) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <View style={styles.emptyState}>
            <Ionicons name="radio-outline" size={hp(6)} color={theme.colors.textSecondary} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyTitle}>Circles is coming soon</Text>
            <Text style={styles.emptySubtitle}>We’re finishing the live rooms experience.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
              <Text style={styles.emptyButtonText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }
  const {
    dailyTopic,
    circleStats,
    submitPreAnswer,
    getCurrentViewpoint,
    joinCircle,
    getYesterdayInsights,
  } = useCirclesContext()

  const [showPreAnswerModal, setShowPreAnswerModal] = useState(false)
  const [showCircleRoom, setShowCircleRoom] = useState(false)
  const [currentRoomInfo, setCurrentRoomInfo] = useState(null)

  const currentViewpoint = getCurrentViewpoint()
  const yesterdayInsights = getYesterdayInsights()

  const handleSubmitAnswer = (answer, confidence) => {
    submitPreAnswer(answer, confidence)
    setShowPreAnswerModal(false)

    // Show join options
    handleJoinCircle()
  }

  const handleJoinCircle = () => {
    try {
      const roomInfo = joinCircle(false) // Not anonymous for now
      setCurrentRoomInfo(roomInfo)
      setShowCircleRoom(true)
    } catch (error) {
      console.error('Failed to join circle:', error)
      Alert.alert('Error', getFriendlyErrorMessage(error, 'Unable to join the circle right now.'))
    }
  }

  const isCircleLive = () => {
    const now = new Date()
    const hours = now.getHours()
    // Circle is live between 7 PM and 11:59 PM
    return hours >= 19 && hours <= 23
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
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>🎙️ Circles</Text>
              <Text style={styles.subtitle}>Join today's conversation</Text>
            </View>
          </View>

          {/* Today's Circle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎙️ TODAY'S CIRCLE</Text>
            <CircleCard
              topic={dailyTopic.topic}
              subtitle={dailyTopic.subtitle}
              totalParticipants={circleStats.totalParticipants}
              activeRooms={circleStats.activeRooms}
              userAnswer={currentViewpoint?.initial?.answer}
              isLive={isCircleLive()}
              onPress={handleJoinCircle}
              onSubmitAnswer={() => setShowPreAnswerModal(true)}
            />
          </View>

          {/* How It Works */}
          {!currentViewpoint && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>HOW IT WORKS</Text>
              <View style={styles.howItWorksCard}>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Submit Your Answer</Text>
                    <Text style={styles.stepText}>
                      Share your initial take on today's topic
                    </Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Join the Conversation</Text>
                    <Text style={styles.stepText}>
                      Listen and speak with 30-50 other students
                    </Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Update Your Viewpoint</Text>
                    <Text style={styles.stepText}>
                      Track how your perspective evolves
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Yesterday's Insights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 YESTERDAY'S HIGHLIGHTS</Text>
            <View style={styles.insightsCard}>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{yesterdayInsights.totalParticipants}</Text>
                  <Text style={styles.statLabel}>Students joined</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{yesterdayInsights.viewpointChanges}</Text>
                  <Text style={styles.statLabel}>Changed their mind</Text>
                </View>
              </View>

              <View style={styles.insightDivider} />

              <Text style={styles.insightTitle}>Most common viewpoint shift:</Text>
              {yesterdayInsights.biggestShifts.slice(0, 1).map((shift, index) => (
                <View key={index} style={styles.shiftItem}>
                  <Text style={styles.shiftFrom}>{shift.from}</Text>
                  <Ionicons name="arrow-forward" size={hp(2)} color={theme.colors.bondedPurple} />
                  <Text style={styles.shiftTo}>{shift.to}</Text>
                  <Text style={styles.shiftCount}>({shift.count} students)</Text>
                </View>
              ))}

              <View style={styles.insightDivider} />

              <Text style={styles.insightTitle}>Most persuasive speakers:</Text>
              {yesterdayInsights.mostPersuasive.map((speaker, index) => (
                <View key={index} style={styles.speakerItem}>
                  <Text style={styles.speakerRank}>{index + 1}.</Text>
                  <Text style={styles.speakerName}>{speaker.name}</Text>
                  <Text style={styles.speakerInfluence}>
                    (convinced {speaker.influenced})
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Topic Schedule */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ UPCOMING TOPICS</Text>
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleText}>
                New topic drops every day at 7:00 PM
              </Text>
              <Text style={styles.scheduleSubtext}>
                Set reminder to never miss a Circle
              </Text>
              <TouchableOpacity style={styles.reminderButton}>
                <Ionicons name="notifications-outline" size={hp(2)} color={theme.colors.bondedPurple} />
                <Text style={styles.reminderText}>Set Daily Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <BottomNav />

        {/* Pre-Answer Modal */}
        <PreAnswerModal
          visible={showPreAnswerModal}
          topic={dailyTopic.topic}
          subtitle={dailyTopic.subtitle}
          onClose={() => setShowPreAnswerModal(false)}
          onSubmit={handleSubmitAnswer}
        />

        {/* Circle Room */}
        {showCircleRoom && currentRoomInfo && (
          <CircleRoom
            visible={showCircleRoom}
            topic={dailyTopic.topic}
            roomNumber={currentRoomInfo.roomNumber}
            totalRooms={currentRoomInfo.totalRooms}
            userViewpoint={currentViewpoint}
            onClose={() => setShowCircleRoom(false)}
            onUpdateViewpoint={() => {}}
          />
        )}
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
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(8),
  },
  emptyTitle: {
    marginTop: hp(2),
    fontSize: hp(2.2),
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    marginTop: hp(1),
    fontSize: hp(1.7),
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: hp(2),
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.2),
    borderRadius: 999,
    backgroundColor: theme.colors.bondedPurple,
  },
  emptyButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  content: {
    paddingBottom: hp(12),
  },
  header: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(1),
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: hp(3.4),
    fontWeight: '900',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    letterSpacing: -1,
    marginBottom: hp(0.5),
  },
  subtitle: {
    fontSize: hp(1.7),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.6,
  },
  section: {
    marginBottom: hp(3),
  },
  sectionTitle: {
    fontSize: hp(1.5),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    letterSpacing: 0.5,
    marginLeft: wp(4),
    marginBottom: hp(1.5),
  },
  howItWorksCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    padding: wp(5),
    marginHorizontal: wp(4),
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: hp(2.5),
  },
  stepNumber: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  stepNumberText: {
    fontSize: hp(1.8),
    fontWeight: '700',
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.heading,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.3),
  },
  stepText: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.8,
    lineHeight: hp(2.1),
  },
  insightsCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    padding: wp(5),
    marginHorizontal: wp(4),
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: hp(2),
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: hp(3.5),
    fontWeight: '800',
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.heading,
  },
  statLabel: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.7,
    marginTop: hp(0.3),
  },
  insightDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: hp(2),
  },
  insightTitle: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(1),
  },
  shiftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  shiftFrom: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontStyle: 'italic',
  },
  shiftTo: {
    fontSize: hp(1.5),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  shiftCount: {
    fontSize: hp(1.4),
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  speakerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.8),
    gap: wp(2),
  },
  speakerRank: {
    fontSize: hp(1.5),
    fontWeight: '700',
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.heading,
  },
  speakerName: {
    fontSize: hp(1.5),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  speakerInfluence: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.7,
  },
  scheduleCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    padding: wp(5),
    marginHorizontal: wp(4),
    alignItems: 'center',
  },
  scheduleText: {
    fontSize: hp(1.7),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    textAlign: 'center',
    marginBottom: hp(0.5),
  },
  scheduleSubtext: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: hp(2),
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    gap: wp(2),
  },
  reminderText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.body,
  },
})
