/**
 * Forum Preferences Component
 * Allows users to opt-out of auto-joining forums and chats
 */

import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { useForumPreferences, useUpdateForumPreferences } from '../hooks/useForumPreferences'

export default function ForumPreferences() {
  const { data: preferences, isLoading } = useForumPreferences()
  const updatePreferences = useUpdateForumPreferences()

  const handleToggleCourseForums = (value) => {
    updatePreferences.mutate({
      ...preferences,
      autoJoinCourseForums: value
    })
  }

  const handleToggleSectionChats = (value) => {
    updatePreferences.mutate({
      ...preferences,
      autoJoinSectionChats: value
    })
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Forum & Chat Preferences</Text>
        <Text style={styles.subtitle}>
          Control how you're automatically added to class forums and section chats
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Course Forums</Text>
            <Text style={styles.settingDescription}>
              Automatically join discussion forums for your enrolled courses
            </Text>
          </View>
          <Switch
            value={preferences?.autoJoinCourseForums ?? true}
            onValueChange={handleToggleCourseForums}
            trackColor={{ true: '#7C3AED', false: '#E5E7EB' }}
            thumbColor={preferences?.autoJoinCourseForums ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Section Chats</Text>
            <Text style={styles.settingDescription}>
              Automatically join group chats for your specific class sections
            </Text>
          </View>
          <Switch
            value={preferences?.autoJoinSectionChats ?? true}
            onValueChange={handleToggleSectionChats}
            trackColor={{ true: '#7C3AED', false: '#E5E7EB' }}
            thumbColor={preferences?.autoJoinSectionChats ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>What's the difference?</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>📚 Course Forums:</Text>
          <Text style={styles.infoText}>
            All students in the same course can participate, regardless of section. 
            Great for general questions, study groups, and course-wide announcements.
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>💬 Section Chats:</Text>
          <Text style={styles.infoText}>
            Only students in your specific section can participate. 
            Perfect for section-specific discussions, schedule coordination, and professor-specific help.
          </Text>
        </View>
      </View>

      <View style={styles.noteSection}>
        <Text style={styles.noteText}>
          💡 You can always manually join or leave forums and chats later in Settings
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  noteSection: {
    padding: 20,
    backgroundColor: '#FEF3C7',
    margin: 20,
    borderRadius: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
  },
})
