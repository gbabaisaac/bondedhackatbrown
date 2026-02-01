import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Pressable, TextInput } from 'react-native'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme } from '../app/theme'
import { hp, wp } from '../helpers/common'

const Picker = ({ 
  label, 
  placeholder, 
  value, 
  options, 
  onValueChange,
  searchable = false,
  containerStyle,
  theme: customTheme, // Optional theme override (for onboarding) - when provided, completely bypasses app theme
}) => {
  // Always call hook (React rules), but ignore if customTheme provided
  const appTheme = useAppTheme()
  const theme = customTheme || appTheme // Use custom theme if provided, otherwise use app theme
  const styles = createStyles(theme)
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Safety check: ensure options is an array
  const safeOptions = Array.isArray(options) ? options : []
  
  // Debug: Log if options are empty
  if (safeOptions.length === 0 && options) {
    console.warn('Picker: Options array is empty or invalid', { options, label })
  }
  
  const filteredOptions = searchable && searchQuery
    ? safeOptions.filter(option => 
        option?.label?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : safeOptions

  const selectedOption = safeOptions.find(opt => opt?.value === value)

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerText, !selectedOption && styles.placeholder]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={hp(2.5)} 
          color={theme.colors.softBlack} 
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Header - Fixed at top */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsOpen(false)
                  setSearchQuery('')
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={hp(3)} color={theme.colors.charcoal} />
              </TouchableOpacity>
            </View>

            {/* Search Input - Fixed below header */}
            {searchable && (
              <View style={styles.searchContainer}>
                <Ionicons 
                  name="search" 
                  size={hp(2.5)} 
                  color={theme.colors.softBlack} 
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={theme.colors.softBlack + '80'}
                  autoFocus={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearButton}
                  >
                    <Ionicons 
                      name="close-circle" 
                      size={hp(2.5)} 
                      color={theme.colors.softBlack} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Options List - Scrollable below search */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => String(item?.value || Math.random())}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    value === item?.value && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    if (item?.value !== undefined) {
                      onValueChange(item.value)
                      setIsOpen(false)
                      setSearchQuery('')
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === item?.value && styles.optionTextSelected,
                    ]}
                  >
                    {item?.label || 'Unknown'}
                  </Text>
                  {value === item?.value && (
                    <Ionicons 
                      name="checkmark" 
                      size={hp(2.5)} 
                      color={theme.colors.bondedPurple} 
                    />
                  )}
                </TouchableOpacity>
              )}
              style={styles.optionsList}
              contentContainerStyle={styles.optionsListContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No results found' : 'No options available'}
                  </Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

export default Picker

const createStyles = (theme) => StyleSheet.create({
  container: {
    marginBottom: hp(2),
  },
  label: {
    fontSize: hp(2),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(1),
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(4),
    borderWidth: 2,
    borderColor: theme.colors.border,
    minHeight: hp(6),
  },
  pickerText: {
    fontSize: hp(2),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    flex: 1,
  },
  placeholder: {
    color: theme.colors.textSecondary,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    height: hp(70),
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
  },
  modalTitle: {
    fontSize: hp(2.5),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  closeButton: {
    padding: hp(0.5),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    marginHorizontal: wp(6),
    marginVertical: hp(1.5),
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
  },
  searchIcon: {
    marginRight: wp(2),
  },
  searchInput: {
    flex: 1,
    fontSize: hp(2),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  clearButton: {
    padding: hp(0.5),
  },
  optionsList: {
    flex: 1,
    maxHeight: hp(50), // Limit height so it doesn't cover search
  },
  optionsListContent: {
    paddingVertical: hp(1),
    paddingBottom: hp(4),
  },
  emptyContainer: {
    paddingVertical: hp(4),
    alignItems: 'center',
  },
  emptyText: {
    fontSize: hp(2),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
  },
  optionItemSelected: {
    backgroundColor: theme.colors.bondedPurple + '10',
  },
  optionText: {
    fontSize: hp(2),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  optionTextSelected: {
    color: theme.colors.bondedPurple,
    fontWeight: '600',
  },
})

