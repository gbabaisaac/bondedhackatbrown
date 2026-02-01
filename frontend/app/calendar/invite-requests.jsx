import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../theme'
import AppTopBar from '../../components/AppTopBar'
import BottomNav from '../../components/BottomNav'
import { ChevronLeft, Check, X } from '../../components/Icons'

// Mock invitees data - in real app, fetch from API
const MOCK_INVITEES = [
  { id: 'user-1', name: 'Danielle Williams', avatar: 'DW', status: 'pending' },
  { id: 'user-2', name: 'John Smith', avatar: 'JS', status: 'pending' },
  { id: 'user-3', name: 'Sarah Johnson', avatar: 'SJ', status: 'going' },
  { id: 'user-4', name: 'Mike Chen', avatar: 'MC', status: 'not_going' },
  { id: 'user-5', name: 'Emma Davis', avatar: 'ED', status: 'pending' },
]

export default function InviteRequests() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const params = useLocalSearchParams()
  const { eventId, title, isMandatory } = params

  const [invitees, setInvitees] = useState(
    MOCK_INVITEES.map(inv => ({
      ...inv,
      status: isMandatory === 'true' ? 'going' : inv.status, // Auto-set to going if mandatory
    }))
  )

  const handleStatusChange = (inviteeId, newStatus) => {
    setInvitees((prev) =>
      prev.map((inv) => (inv.id === inviteeId ? { ...inv, status: newStatus } : inv))
    )
  }

  const goingCount = invitees.filter((inv) => inv.status === 'going').length
  const notGoingCount = invitees.filter((inv) => inv.status === 'not_going').length
  const pendingCount = invitees.filter((inv) => inv.status === 'pending').length

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <AppTopBar
          schoolName="University of Rhode Island"
          onPressProfile={() => router.push('/profile')}
          onPressSchool={() => {}}
          onPressNotifications={() => router.push('/notifications')}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={hp(2.5)} color={theme.colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invite Requests</Text>
          <View style={styles.backButton} />
        </View>

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{title || 'General Meeting'}</Text>
          {isMandatory === 'true' && (
            <View style={styles.mandatoryBadge}>
              <Text style={styles.mandatoryText}>Mandatory Event</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{goingCount}</Text>
            <Text style={styles.statLabel}>Going</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{notGoingCount}</Text>
            <Text style={styles.statLabel}>Not Going</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Invitees List */}
        <ScrollView style={styles.inviteesList} showsVerticalScrollIndicator={false}>
          {invitees.map((invitee) => (
            <View key={invitee.id} style={styles.inviteeCard}>
              <View style={styles.inviteeLeft}>
                <View style={styles.inviteeAvatar}>
                  <Text style={styles.inviteeAvatarText}>{invitee.avatar}</Text>
                </View>
                <Text style={styles.inviteeName}>{invitee.name}</Text>
              </View>

              {isMandatory === 'true' ? (
                <View style={styles.mandatoryStatus}>
                  <Text style={styles.mandatoryStatusText}>Required</Text>
                </View>
              ) : (
                <View style={styles.statusButtons}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      styles.statusButtonGoing,
                      invitee.status === 'going' && styles.statusButtonActive,
                    ]}
                    onPress={() => handleStatusChange(invitee.id, 'going')}
                    activeOpacity={0.7}
                  >
                    <Check
                      size={hp(1.8)}
                      color={invitee.status === 'going' ? theme.colors.white : theme.colors.bondedPurple}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={[
                        styles.statusButtonText,
                        invitee.status === 'going' && styles.statusButtonTextActive,
                      ]}
                    >
                      Going
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      styles.statusButtonNotGoing,
                      invitee.status === 'not_going' && styles.statusButtonActive,
                    ]}
                    onPress={() => handleStatusChange(invitee.id, 'not_going')}
                    activeOpacity={0.7}
                  >
                    <X
                      size={hp(1.8)}
                      color={invitee.status === 'not_going' ? theme.colors.white : theme.colors.textSecondary}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={[
                        styles.statusButtonText,
                        invitee.status === 'not_going' && styles.statusButtonTextActive,
                      ]}
                    >
                      Not Going
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <BottomNav />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: hp(4),
  },
  headerTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  eventInfo: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  eventTitle: {
    fontSize: hp(2.2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
  },
  mandatoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.bondedPurple + '15',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: theme.radius.md,
  },
  mandatoryText: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.bondedPurple,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: hp(2.5),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: hp(0.5),
  },
  statLabel: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  inviteesList: {
    flex: 1,
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
  },
  inviteeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inviteeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inviteeAvatar: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  inviteeAvatarText: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  inviteeName: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: wp(2),
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    gap: wp(1.5),
  },
  statusButtonGoing: {
    borderColor: theme.colors.bondedPurple,
    backgroundColor: theme.colors.background,
  },
  statusButtonNotGoing: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  statusButtonActive: {
    backgroundColor: theme.colors.bondedPurple,
    borderColor: theme.colors.bondedPurple,
  },
  statusButtonText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.bondedPurple,
  },
  statusButtonTextActive: {
    color: theme.colors.white,
  },
  mandatoryStatus: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    backgroundColor: theme.colors.bondedPurple + '15',
    borderRadius: theme.radius.md,
  },
  mandatoryStatusText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.bondedPurple,
  },
})

