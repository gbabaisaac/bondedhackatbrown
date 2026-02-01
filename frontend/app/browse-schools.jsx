import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppTopBar from '../components/AppTopBar'
import BottomNav from '../components/BottomNav'
import { hp, wp } from '../helpers/common'
import { useAppTheme } from './theme'
import { isFeatureEnabled } from '../utils/featureGates'

// TODO: Wire to real Supabase data
// - Fetch schools from universities table
const schools: any[] = []

export default function BrowseSchools() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  if (!isFeatureEnabled('BROWSE_SCHOOLS')) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={hp(6)} color={theme.colors.textSecondary} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyTitle}>Browse Schools is coming soon</Text>
            <Text style={styles.emptySubtitle}>We’re finalizing campus discovery.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
              <Text style={styles.emptyButtonText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.location.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderSchool = ({ item }) => (
    <TouchableOpacity
      style={styles.schoolCard}
      activeOpacity={0.8}
      onPress={() => {
        router.push({
          pathname: '/forum',
          params: { schoolName: item.name },
        })
      }}
    >
      <View style={styles.schoolInfo}>
        <Text style={styles.schoolName}>{item.name}</Text>
        <View style={styles.schoolMeta}>
          <Ionicons
            name="location-outline"
            size={hp(1.6)}
            color={theme.colors.textSecondary}
            style={{ marginRight: wp(1) }}
          />
          <Text style={styles.schoolLocation}>{item.location}</Text>
          <Text style={styles.schoolSeparator}> • </Text>
          <Text style={styles.schoolStudents}>{item.students} students</Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={hp(2)}
        color={theme.colors.softBlack}
        style={{ opacity: 0.5 }}
      />
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <AppTopBar
          schoolName="University of Rhode Island"
          onPressProfile={() => router.push('/profile')}
          onPressSchool={() => router.back()}
          onPressNotifications={() => router.push('/notifications')}
        />

        <Text style={styles.title}>Browse Schools</Text>
        <Text style={styles.subtitle}>Explore forums from other universities</Text>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={hp(2.2)}
            color={theme.colors.textSecondary}
            style={{ marginRight: wp(2) }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search schools..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredSchools}
          keyExtractor={(item) => item.id}
          renderItem={renderSchool}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        <BottomNav />
      </View>
    </SafeAreaView>
  )
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
  },
  title: {
    fontSize: hp(2.6),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.5),
  },
  subtitle: {
    fontSize: hp(1.7),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.8,
    marginBottom: hp(2),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: hp(1.8),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  listContent: {
    paddingBottom: hp(10),
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(6),
  },
  emptyTitle: {
    marginTop: hp(2),
    fontSize: hp(2.2),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
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
  schoolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    padding: wp(4),
    marginBottom: hp(1.5),
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: hp(2),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.5),
  },
  schoolMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  schoolLocation: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.8,
  },
  schoolSeparator: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    opacity: 0.5,
  },
  schoolStudents: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.8,
  },
})
