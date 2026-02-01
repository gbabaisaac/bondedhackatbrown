import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useMemo, useRef, useState } from 'react'
import { Animated, FlatList, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppCard from '../components/AppCard'
import AppTopBar from '../components/AppTopBar'
import BottomNav from '../components/BottomNav'
import { useProfileModal } from '../contexts/ProfileModalContext'
import { hp, wp } from '../helpers/common'
import { useClassMatching, useUniversityProfiles } from '../hooks/useClassMatching'
import { useAppTheme } from './theme'

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

export default function Network() {
  const router = useRouter()
  const theme = useAppTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const { openProfile } = useProfileModal()
  const scrollY = useRef(new Animated.Value(0)).current
  const lastScrollY = useRef(0)
  const headerTranslateY = useRef(new Animated.Value(0)).current
  const isAnimating = useRef(false)

  // Fetch classmates (users who share classes)
  const { data: classmates = [], isLoading: isLoadingClassmates } = useClassMatching()

  // Fallback to university profiles if no classmates
  const { data: universityProfiles = [], isLoading: isLoadingUni } = useUniversityProfiles()

  // Combine data - prioritize classmates, then university profiles
  const connections = useMemo(() => {
    if (classmates.length > 0) {
      return classmates
    }
    return universityProfiles
  }, [classmates, universityProfiles])

  const isLoading = isLoadingClassmates || isLoadingUni

  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections

    const query = searchQuery.toLowerCase()
    return connections.filter((profile) => {
      const name = profile.full_name || ''
      const major = profile.major || ''
      const quote = profile.yearbook_quote || ''
      return (
        name.toLowerCase().includes(query) ||
        major.toLowerCase().includes(query) ||
        quote.toLowerCase().includes(query)
      )
    })
  }, [connections, searchQuery])

  const numColumns = 3
  const gap = theme.spacing.sm
  const padding = theme.spacing.sm
  const cardWidth = (wp(100) - (padding * 2) - (gap * (numColumns - 1))) / numColumns

  const renderProfileCard = ({ item, index }) => {
    const displayName = item.full_name || item.username || 'Unknown'
    const photoUrl = item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`
    const quote = item.yearbook_quote || ''
    const major = item.major || ''
    const sharedClassCount = item.sharedClassCount || 0

    return (
      <TouchableOpacity
        style={[styles.cardWrapper, { width: cardWidth }]}
        activeOpacity={0.9}
        onPress={() => {
          openProfile(item.id)
        }}
      >
        <AppCard radius="md" padding={false} style={styles.card}>
          <View style={styles.cardImageWrapper}>
            <Image source={{ uri: photoUrl }} style={styles.cardImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
              style={styles.cardGradient}
            />
            {/* Name Over Image */}
            <View style={styles.cardOverlayContent}>
              <Text numberOfLines={1} style={styles.cardName}>
                {displayName}
              </Text>
              {sharedClassCount > 0 && (
                <View style={styles.sharedClassBadge}>
                  <Ionicons name="school-outline" size={hp(1.2)} color="#fff" />
                  <Text style={styles.sharedClassText}>{sharedClassCount}</Text>
                </View>
              )}
            </View>
          </View>
          {/* Tagline and Major Badge */}
          <View style={styles.cardInfo}>
            <Text numberOfLines={2} style={styles.cardQuote}>
              {quote || `${major} student`}
            </Text>
            {/* Major Badge - Below Quote */}
            {major ? (
              <View style={styles.cardBadge}>
                <Text
                  style={styles.cardBadgeText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {major.split(' ')[0]}
                </Text>
              </View>
            ) : null}
          </View>
        </AppCard>
      </TouchableOpacity>
    )
  }

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y
        const scrollDifference = currentScrollY - lastScrollY.current

        // Prevent multiple animations from running
        if (isAnimating.current) {
          lastScrollY.current = currentScrollY
          return
        }

        // Ignore small scrolls
        if (Math.abs(scrollDifference) < 3) {
          return
        }

        if (currentScrollY <= 0) {
          // At the very top - always show
          isAnimating.current = true
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            isAnimating.current = false
          })
        } else if (scrollDifference > 0) {
          // Scrolling down - hide header
          isAnimating.current = true
          Animated.timing(headerTranslateY, {
            toValue: -200,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            isAnimating.current = false
          })
        } else if (scrollDifference < 0) {
          // Scrolling up - show header
          isAnimating.current = true
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            isAnimating.current = false
          })
        }

        lastScrollY.current = currentScrollY
      },
    }
  )

  const styles = createStyles(theme)

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Animated.View
          style={{
            transform: [{ translateY: headerTranslateY }],
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            backgroundColor: theme.colors.background,
            paddingHorizontal: wp(4),
          }}
        >
          <AppTopBar
            schoolName="My Network"
            onPressProfile={() => router.push('/profile')}
            onPressSchool={() => { }}
            onPressNotifications={() => router.push('/notifications')}
          />

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={hp(2)}
              color={theme.colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search connections..."
              placeholderTextColor={theme.colors.textSecondary + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={hp(2)}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Header Info */}
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              {filteredConnections.length} {filteredConnections.length === 1 ? 'Connection' : 'Connections'}
            </Text>
          </View>
        </Animated.View>

        {/* Profile Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading connections...</Text>
          </View>
        ) : (
          <AnimatedFlatList
            data={filteredConnections}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? styles.cardRow : null}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={renderProfileCard}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name="people-outline"
                  size={hp(6)}
                  color={theme.colors.textSecondary}
                  style={{ opacity: 0.3 }}
                />
                <Text style={styles.emptyStateText}>
                  {searchQuery ? 'No connections found' : 'No connections yet'}
                </Text>
                {searchQuery && (
                  <Text style={styles.emptyStateSubtext}>
                    Try searching with a different name
                  </Text>
                )}
              </View>
            }
          />
        )}

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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  headerContent: {
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(20),
  },
  loadingText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  listContent: {
    paddingTop: hp(18),
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: hp(10),
  },
  cardRow: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  cardWrapper: {
    marginBottom: theme.spacing.sm,
  },
  card: {
    overflow: 'hidden',
  },
  cardImageWrapper: {
    width: '100%',
    height: hp(20),
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  cardOverlayContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.sm,
  },
  cardName: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.white,
  },
  cardInfo: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  cardQuote: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: theme.typography.sizes.base * 1.4,
  },
  cardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  cardBadgeText: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.accent,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(20),
    paddingHorizontal: theme.spacing.lg,
  },
  emptyStateText: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  profileModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileModalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? hp(6) : hp(2),
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileModalTopBarButton: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalTopBarCircle: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalScroll: {
    flex: 1,
  },
  profileModalContent: {
    paddingBottom: hp(10),
  },
  profileModalImageContainer: {
    width: '100%',
    height: hp(40),
    backgroundColor: theme.colors.backgroundSecondary,
  },
  profileModalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileModalInfo: {
    padding: theme.spacing.lg,
  },
  profileModalName: {
    fontSize: theme.typography.sizes.xxl,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  profileModalMajor: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  profileModalQuote: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    fontStyle: 'italic',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    lineHeight: theme.typography.sizes.base * 1.6,
  },
  profileModalDetails: {
    gap: theme.spacing.md,
  },
  profileModalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  profileModalDetailText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  sharedClassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    gap: 2,
    marginTop: theme.spacing.xs,
  },
  sharedClassText: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.semibold,
    color: '#fff',
  },
  sharedClassesSection: {
    marginBottom: theme.spacing.lg,
  },
  sharedClassesTitle: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  sharedClassesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  sharedClassChip: {
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  sharedClassChipText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.accent,
  },
  interestsSection: {
    marginTop: theme.spacing.lg,
  },
  interestsTitle: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  interestChip: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  interestChipText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
})











