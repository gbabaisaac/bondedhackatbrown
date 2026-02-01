import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native'
import { X, Search, ChevronDown, ChevronUp, CheckCircle2 } from '../Icons'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'
import { getForumTagColors } from '../../helpers/themeHelpers'

// Predefined tags for Bonded forums
const AVAILABLE_TAGS = [
  'Housing',
  'STEM',
  'Need Help',
  'Lost & Found',
  'Roommate Match',
  'Events',
  'Advice',
  'Clubs',
  'Random',
  'Confessions',
  'Study Group',
  'Class Discussion',
  'Campus Life',
  'Food',
  'Transportation',
  'Jobs',
  'Buy/Sell',
]

const MAX_TAGS = 3

// Helper function to get tag color
const getTagColor = (tag, theme) => {
  return getForumTagColors(tag, theme)
}

export default function TagSelector({ selectedTags = [], onTagsChange, style }) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllTags, setShowAllTags] = useState(false)

  const filteredTags = AVAILABLE_TAGS.filter((tag) =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      // Remove tag
      onTagsChange(selectedTags.filter((t) => t !== tag))
    } else {
      // Add tag (max 3)
      if (selectedTags.length < MAX_TAGS) {
        onTagsChange([...selectedTags, tag])
      }
    }
  }

  const removeTag = (tag) => {
    onTagsChange(selectedTags.filter((t) => t !== tag))
  }

  const displayTags = showAllTags ? filteredTags : filteredTags.slice(0, 6)

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Tags (optional, max {MAX_TAGS})</Text>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <View style={styles.selectedTagsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedTagsScroll}
          >
            {selectedTags.map((tag) => {
              const tagColor = getTagColor(tag, theme)
              return (
                <View 
                  key={tag} 
                  style={[
                    styles.selectedTag,
                    { backgroundColor: tagColor.border }
                  ]}
                >
                  <Text style={styles.selectedTagText}>{tag}</Text>
                  <TouchableOpacity
                    onPress={() => removeTag(tag)}
                    style={styles.removeTagButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X
                      size={hp(1.6)}
                      color={theme.colors.white}
                      strokeWidth={2.5}
                    />
                  </TouchableOpacity>
                </View>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Search
          size={hp(1.6)}
          color={theme.colors.textSecondary}
          strokeWidth={2}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tags..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Available Tags */}
      <View style={styles.tagsContainer}>
        <ScrollView
          style={styles.tagsScroll}
          contentContainerStyle={styles.tagsScrollContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <View style={styles.tagsGrid}>
            {displayTags.map((tag) => {
              const isSelected = selectedTags.includes(tag)
              const isDisabled = !isSelected && selectedTags.length >= MAX_TAGS

              const tagColor = getTagColor(tag, theme)
              
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagChip,
                    { 
                      backgroundColor: isSelected ? tagColor.border : tagColor.bg,
                      borderColor: tagColor.border,
                    },
                    isDisabled && styles.tagChipDisabled,
                  ]}
                  onPress={() => toggleTag(tag)}
                  disabled={isDisabled}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      { 
                        color: isSelected ? theme.colors.white : tagColor.text,
                      },
                      isDisabled && styles.tagChipTextDisabled,
                    ]}
                  >
                    {tag}
                  </Text>
                  {isSelected && (
                    <CheckCircle2
                      size={hp(1.6)}
                      color={theme.colors.white}
                      strokeWidth={2.5}
                      style={{ marginLeft: wp(1) }}
                    />
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>

        {filteredTags.length > 6 && (
          <TouchableOpacity
            style={styles.showMoreButton}
            onPress={() => setShowAllTags(!showAllTags)}
            activeOpacity={0.7}
          >
            <Text style={styles.showMoreText}>
              {showAllTags ? 'Show Less' : `Show All (${filteredTags.length})`}
            </Text>
            {showAllTags ? (
              <ChevronUp
                size={hp(1.5)}
                color={theme.colors.bondedPurple}
                strokeWidth={2.5}
              />
            ) : (
              <ChevronDown
                size={hp(1.5)}
                color={theme.colors.bondedPurple}
                strokeWidth={2.5}
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      {selectedTags.length >= MAX_TAGS && (
        <Text style={styles.maxTagsWarning}>
          Maximum {MAX_TAGS} tags selected
        </Text>
      )}
    </View>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    marginVertical: hp(1.5),
  },
  label: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(1.5),
  },
  selectedTagsContainer: {
    marginBottom: hp(1.5),
    minHeight: hp(4),
  },
  selectedTagsScroll: {
    paddingRight: wp(4),
    paddingVertical: hp(0.5),
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.pill,
    marginRight: wp(2),
  },
  selectedTagText: {
    fontSize: hp(1.4),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  removeTagButton: {
    marginLeft: wp(1.5),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    marginBottom: hp(1.5),
  },
  searchIcon: {
    marginRight: wp(2),
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  tagsContainer: {
    maxHeight: hp(25),
    marginBottom: hp(1),
  },
  tagsScroll: {
    flex: 1,
  },
  tagsScrollContent: {
    paddingBottom: hp(3),
    paddingTop: hp(0.5),
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    paddingBottom: hp(2),
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
  },
  tagChipDisabled: {
    opacity: 0.4,
  },
  tagChipText: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  tagChipTextDisabled: {
    color: theme.colors.textSecondary,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1),
    marginTop: hp(0.5),
  },
  showMoreText: {
    fontSize: hp(1.5),
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    marginRight: wp(1),
  },
  maxTagsWarning: {
    fontSize: hp(1.3),
    color: theme.colors.error,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(0.5),
    fontStyle: 'italic',
  },
})

