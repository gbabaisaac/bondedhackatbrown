import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppTheme } from '../app/theme'
import { hp, wp } from '../helpers/common'
import { supabase } from '../lib/supabase'

const ForumSelectorModal = ({ visible, forums, currentForumId, onSelectForum, onClose, onCreateForum }) => {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    campus: true, // Main forum section expanded by default
    pinned: true,
    classes: true,
    orgs: true,
    private: true,
  })

  // Navigate to class section chat
  const handleClassChatPress = async (item) => {
    try {
      // Find the conversation for this class section
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'group')
        .eq('class_section_id', item.class_section_id)
        .maybeSingle()

      if (error) {
        console.error('Error finding class chat:', error)
        return
      }

      if (conversation?.id) {
        onClose()
        router.push(`/chat?conversationId=${conversation.id}`)
      } else {
        console.log('No chat found for this class section')
      }
    } catch (err) {
      console.error('Error navigating to class chat:', err)
    }
  }

  // Organize forums by category
  const organizedForums = useMemo(() => {
    // Campus forums (main forum) - should be pinned and shown first
    const campusForums = forums.filter((f) => f.type === 'campus')
    // Pinned forums (including campus forums)
    const pinned = forums.filter((f) => f.isPinned || f.type === 'campus')
    const classes = forums.filter((f) => f.type === 'class')
    const orgs = forums.filter((f) => f.type === 'org')
    const privateForums = forums.filter((f) => f.type === 'private')
    // Filter out campus, class, org, private AND main forums (Main is already shown at top)
    const other = forums.filter(
      (f) => !f.isPinned && 
             f.type !== 'class' && 
             f.type !== 'org' && 
             f.type !== 'private' && 
             f.type !== 'campus' &&
             f.type !== 'main' &&
             f.name?.toLowerCase() !== 'main' // Also filter by name in case type isn't set
    )

    return { campus: campusForums, pinned, classes, orgs, private: privateForums, other }
  }, [forums])

  // Filter forums by search query
  const filteredForums = useMemo(() => {
    if (!searchQuery.trim()) return organizedForums

    const query = searchQuery.toLowerCase()
    const allForums = [
      ...organizedForums.campus,
      ...organizedForums.pinned,
      ...organizedForums.classes,
      ...organizedForums.orgs,
      ...organizedForums.private,
      ...organizedForums.other,
    ]

    const filtered = allForums.filter(
      (forum) =>
        forum.name.toLowerCase().includes(query) ||
        forum.description?.toLowerCase().includes(query) ||
        forum.code?.toLowerCase().includes(query)
    )

    return {
      campus: filtered.filter((f) => f.type === 'campus'),
      pinned: filtered.filter((f) => f.isPinned),
      classes: filtered.filter((f) => f.type === 'class'),
      orgs: filtered.filter((f) => f.type === 'org'),
      private: filtered.filter((f) => f.type === 'private'),
      other: filtered.filter(
        (f) => !f.isPinned && 
               f.type !== 'class' && 
               f.type !== 'org' && 
               f.type !== 'private' &&
               f.type !== 'campus' &&
               f.type !== 'main' &&
               f.name?.toLowerCase() !== 'main'
      ),
    }
  }, [searchQuery, organizedForums])

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const getForumIcon = (type) => {
    switch (type) {
      case 'main':
      case 'campus':
        return 'globe-outline'
      case 'class':
        return 'school-outline'
      case 'org':
        return 'people-outline'
      case 'private':
        return 'lock-closed-outline'
      default:
        return 'chatbubbles-outline'
    }
  }

  const getForumColor = (type) => {
    switch (type) {
      case 'main':
      case 'campus':
        return theme.colors.bondedPurple
      case 'class':
        return '#4ECDC4'
      case 'org':
        return '#FF6B6B'
      case 'private':
        return '#95E1D3'
      default:
        return theme.colors.bondedPurple
    }
  }

  const renderForumItem = ({ item }) => {
    const isSelected = item.id === currentForumId
    const iconColor = getForumColor(item.type)
    const isClass = item.type === 'class'

    return (
      <TouchableOpacity
        style={[styles.forumItem, isSelected && styles.forumItemSelected]}
        onPress={() => {
          // For classes and other forums, clicking opens the forum
          onSelectForum(item)
          onClose()
        }}
        activeOpacity={0.7}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.forumImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.forumIcon, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={getForumIcon(item.type)} size={hp(2.2)} color={iconColor} />
          </View>
        )}
        <View style={styles.forumInfo}>
          <Text style={styles.forumName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={styles.forumDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <View style={styles.forumMeta}>
            {item.memberCount !== undefined && item.memberCount !== null && item.memberCount >= 0 && (
              <Text style={styles.forumMetaText}>
                {item.memberCount.toLocaleString()} {item.memberCount === 1 ? 'member' : 'members'}
              </Text>
            )}
            {item.postCount !== undefined && item.postCount !== null && (
              <Text style={styles.forumMetaText}>
                {item.postCount.toLocaleString()} {item.postCount === 1 ? 'post' : 'posts'}
              </Text>
            )}
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
        {isClass && item.class_section_id ? (
          // Class: show only chat button (clicking row opens forum)
          <TouchableOpacity
            style={styles.classActionButton}
            onPress={(e) => {
              e.stopPropagation()
              handleClassChatPress(item)
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={hp(2.2)} color={theme.colors.bondedPurple} />
          </TouchableOpacity>
        ) : isSelected ? (
          <Ionicons name="checkmark-circle" size={hp(2.5)} color={theme.colors.bondedPurple} />
        ) : null}
      </TouchableOpacity>
    )
  }

  const renderSection = (title, forums, sectionKey, icon) => {
    if (forums.length === 0) return null

    const isExpanded = expandedSections[sectionKey]
    const hasUnread = forums.some((f) => f.unreadCount > 0)

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            {icon ? (
              <Ionicons
                name={icon}
                size={hp(2)}
                color={theme.colors.textSecondary}
                style={styles.sectionIcon}
              />
            ) : null}
            <Text style={styles.sectionTitle}>{title}</Text>
            {hasUnread && <View style={styles.sectionUnreadDot} />}
            <Text style={styles.sectionCount}>({forums.length})</Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={hp(2)}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.sectionContent}>
            {forums.map((forum) => (
              <View key={forum.id}>{renderForumItem({ item: forum })}</View>
            ))}
          </View>
        )}
      </View>
    )
  }

  const allForumsList = useMemo(() => {
    return [
      ...filteredForums.campus,
      ...filteredForums.pinned.filter(f => f.type !== 'campus'), // Pinned but not campus (to avoid duplicates)
      ...filteredForums.classes,
      ...filteredForums.orgs,
      ...filteredForums.private,
      ...filteredForums.other,
    ]
  }, [filteredForums])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Forums</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={hp(2.5)} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={hp(2)}
              color={theme.colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search forums..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={hp(2)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Forums List */}
          {searchQuery.trim() ? (
            <FlatList
              data={allForumsList}
              renderItem={renderForumItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              data={[]}
              renderItem={() => null}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View>
                  {renderSection('🏫 Main forum', filteredForums.campus, 'campus', 'globe')}
                  {renderSection('⭐ Pinned', filteredForums.pinned.filter(f => f.type !== 'campus'), 'pinned', 'star')}
                  {renderSection('📚 Your classes', filteredForums.classes, 'classes', 'school')}
                  {renderSection('🎯 Public forums', filteredForums.other.filter(f => f.type !== 'campus'), 'other', 'globe')}
                  {renderSection(' My Organizations', filteredForums.orgs, 'orgs', 'people')}
                  {renderSection('🔒 Private Forums', filteredForums.private, 'private', 'lock-closed')}
                </View>
              }
            />
          )}

          {/* Create Forum disabled for V1 */}
        </View>
      </SafeAreaView>
    </Modal>
  )
}

export default ForumSelectorModal

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: hp(2.4),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: hp(0.5),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    marginHorizontal: wp(4),
    marginVertical: hp(1.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: wp(2),
  },
  searchInput: {
    flex: 1,
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  clearButton: {
    padding: hp(0.5),
  },
  listContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(10),
  },
  section: {
    marginBottom: hp(2),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1),
    marginBottom: hp(0.5),
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  sectionIcon: {
    marginRight: wp(1),
  },
  sectionTitle: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  sectionUnreadDot: {
    width: hp(0.8),
    height: hp(0.8),
    borderRadius: hp(0.4),
    backgroundColor: theme.colors.error,
  },
  sectionCount: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  sectionContent: {
    gap: hp(0.5),
  },
  forumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: hp(1.5),
    borderRadius: theme.radius.md,
    marginBottom: hp(0.5),
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
  forumItemSelected: {
    borderColor: theme.colors.bondedPurple,
    borderWidth: 2,
    backgroundColor: theme.colors.bondedPurple + '08',
  },
  forumIcon: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  forumImage: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    marginRight: wp(3),
    backgroundColor: theme.colors.backgroundSecondary,
  },
  forumInfo: {
    flex: 1,
    marginRight: wp(2),
  },
  forumName: {
    fontSize: hp(1.7),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.2),
  },
  forumDescription: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    marginBottom: hp(0.3),
  },
  forumMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  forumMetaText: {
    fontSize: hp(1.2),
    color: theme.colors.textSecondary,
  },
  unreadBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: hp(1),
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.2),
    minWidth: hp(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: hp(1),
    fontWeight: '700',
    color: theme.colors.white,
  },
  classActionButton: {
    padding: hp(1),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bondedPurple + '15',
  },
  footer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bondedPurple + '15',
    paddingVertical: hp(1.5),
    borderRadius: theme.radius.lg,
    gap: wp(2),
  },
  createButtonText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.heading,
  },
})
