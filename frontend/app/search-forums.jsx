import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppTopBar from '../components/AppTopBar'
import { hp, wp } from '../helpers/common'
import { useAppTheme } from './theme'
import { isFeatureEnabled } from '../utils/featureGates'

// TODO: Wire to real Supabase data
// - Use useForums hook to fetch forums
const forums: any[] = []

export default function SearchForums() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const [query, setQuery] = useState('')

  if (!isFeatureEnabled('SEARCH_FORUMS')) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={hp(6)} color={theme.colors.textSecondary} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyTitle}>Forum search is coming soon</Text>
            <Text style={styles.emptySubtitle}>We’re polishing discovery across campus.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
              <Text style={styles.emptyButtonText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  const filtered = forums.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <AppTopBar
          schoolName="University of Rhode Island"
          onPressProfile={() => router.push('/profile')}
          onPressSchool={() => {}}
          onPressNotifications={() => router.push('/notifications')}
        />

        <Text style={styles.title}>Search forums</Text>

        <View style={styles.searchRow}>
          <Ionicons
            name="search-outline"
            size={hp(2.2)}
            color={theme.colors.textSecondary}
            style={{ marginRight: wp(2) }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, class, or topic..."
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.8}
              onPress={() => router.push('/forum')}
            >
              <View style={styles.itemLeft}>
                <Ionicons
                  name={
                    item.type === 'main'
                      ? 'home-outline'
                      : item.type === 'class'
                      ? 'school-outline'
                      : item.type === 'rmp'
                      ? 'clipboard-outline'
                      : 'people-outline'
                  }
                  size={hp(2.1)}
                  color={theme.colors.bondedPurple}
                  style={{ marginRight: wp(2) }}
                />
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={hp(2)}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        />
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
    marginTop: hp(1.5),
    marginBottom: hp(1),
    fontSize: hp(2.4),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.9),
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: hp(1.5),
  },
  searchInput: {
    flex: 1,
    fontSize: hp(1.9),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  list: {
    paddingTop: hp(1),
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontSize: hp(1.9),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
})

