import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'
import AppHeader from '../AppHeader'
import AppCard from '../AppCard'

export default function RepostModal({
  visible,
  post,
  onClose,
  onRepost,
  groups = [],
}) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [repostType, setRepostType] = useState('raw') // 'raw' or 'caption'
  const [caption, setCaption] = useState('')
  const [selectedGroup, setSelectedGroup] = useState(null)

  const handleRepost = () => {
    if (!post) return

    const repostData = {
      postId: post.id,
      type: repostType,
      caption: repostType === 'caption' ? caption.trim() : null,
      groupId: selectedGroup,
    }

    if (onRepost) {
      onRepost(repostData)
    }

    // Reset state
    setRepostType('raw')
    setCaption('')
    setSelectedGroup(null)
    onClose()
  }

  if (!post) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <AppHeader
            title="Repost"
            rightAction={handleRepost}
            rightActionLabel="Repost"
            onBack={onClose}
          />

          {/* Post Preview */}
          <AppCard style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewAvatar}>
                <Text style={styles.previewAvatarText}>
                  {post.isAnon ? '?' : post.author?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewAuthor}>
                  {post.isAnon ? 'Anonymous' : post.author}
                </Text>
                <Text style={styles.previewMeta}>
                  {post.forum} • {post.timeAgo}
                </Text>
              </View>
            </View>
            <Text style={styles.previewTitle} numberOfLines={2}>
              {post.title}
            </Text>
            <Text style={styles.previewBody} numberOfLines={3}>
              {post.body}
            </Text>
          </AppCard>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Repost Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Repost Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    repostType === 'raw' && styles.typeButtonActive,
                  ]}
                  onPress={() => setRepostType('raw')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="repeat-outline"
                    size={hp(2)}
                    color={
                      repostType === 'raw'
                        ? theme.colors.white
                        : theme.colors.bondedPurple
                    }
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      repostType === 'raw' && styles.typeButtonTextActive,
                    ]}
                  >
                    Repost
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    repostType === 'caption' && styles.typeButtonActive,
                  ]}
                  onPress={() => setRepostType('caption')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={hp(2)}
                    color={
                      repostType === 'caption'
                        ? theme.colors.white
                        : theme.colors.bondedPurple
                    }
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      repostType === 'caption' && styles.typeButtonTextActive,
                    ]}
                  >
                    Quote
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Caption Input (if quote repost) */}
            {repostType === 'caption' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Add your thoughts</Text>
                <TextInput
                  style={styles.captionInput}
                  placeholder="What are your thoughts?"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={280}
                />
                <Text style={styles.charCount}>
                  {caption.length}/280
                </Text>
              </View>
            )}

            {/* Group Selection (optional) */}
            {groups.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Repost to Group (optional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.groupsScroll}
                >
                  <TouchableOpacity
                    style={[
                      styles.groupChip,
                      !selectedGroup && styles.groupChipActive,
                    ]}
                    onPress={() => setSelectedGroup(null)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.groupChipText,
                        !selectedGroup && styles.groupChipTextActive,
                      ]}
                    >
                      My Profile
                    </Text>
                  </TouchableOpacity>
                  {groups.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      style={[
                        styles.groupChip,
                        selectedGroup === group.id && styles.groupChipActive,
                      ]}
                      onPress={() => setSelectedGroup(group.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.groupChipText,
                          selectedGroup === group.id &&
                            styles.groupChipTextActive,
                        ]}
                      >
                        {group.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
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
  previewCard: {
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    marginBottom: hp(1),
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  previewAvatar: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: theme.colors.bondedPurple,
    opacity: 0.15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2.5),
  },
  previewAvatarText: {
    fontSize: hp(1.9),
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  previewInfo: {
    flex: 1,
  },
  previewAuthor: {
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '600',
  },
  previewMeta: {
    fontSize: hp(1.35),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(0.1),
  },
  previewTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.5),
  },
  previewBody: {
    fontSize: hp(1.65),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.4),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: wp(4),
    paddingBottom: hp(10),
  },
  section: {
    marginBottom: hp(2),
  },
  sectionTitle: {
    fontSize: hp(1.7),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(1),
  },
  typeButtons: {
    flexDirection: 'row',
    gap: wp(2),
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.bondedPurple,
    gap: wp(1.5),
  },
  typeButtonActive: {
    backgroundColor: theme.colors.bondedPurple,
    borderColor: theme.colors.bondedPurple,
  },
  typeButtonText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.body,
  },
  typeButtonTextActive: {
    color: theme.colors.white,
  },
  captionInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: wp(3),
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    minHeight: hp(12),
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  charCount: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    textAlign: 'right',
    marginTop: hp(0.5),
    opacity: 0.7,
  },
  groupsScroll: {
    paddingRight: wp(4),
  },
  groupChip: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.9),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: wp(2),
  },
  groupChipActive: {
    backgroundColor: theme.colors.bondedPurple,
    borderColor: theme.colors.bondedPurple,
  },
  groupChipText: {
    fontSize: hp(1.5),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  groupChipTextActive: {
    color: theme.colors.white,
  },
})

