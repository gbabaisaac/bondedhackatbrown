import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import { SafeAreaView } from 'react-native-safe-area-context'
import { hp, wp } from '../helpers/common'
import { useAppTheme } from '../app/theme'
import { MapPin } from './Icons'

/**
 * LocationPicker Component
 * 
 * A reusable location picker using Google Places Autocomplete
 * 
 * @param {boolean} visible - Whether the modal is visible
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onSelect - Callback when location is selected: (location) => void
 *                              location = { description, place_id, geometry: { location: { lat, lng } } }
 * @param {string} placeholder - Placeholder text for the input
 * @param {string} initialValue - Initial location value
 */
export default function LocationPicker({
  visible,
  onClose,
  onSelect,
  placeholder = 'Search for a location',
  initialValue = '',
}) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const hasApiKey = apiKey.length > 0

  const handleSelect = (data, details = null) => {
    if (details) {
      const location = {
        description: data.description,
        place_id: data.place_id,
        formatted_address: details.formatted_address,
        coordinates: {
          lat: details.geometry.location.lat,
          lng: details.geometry.location.lng,
        },
        // Additional useful data
        name: details.name,
        address_components: details.address_components,
      }
      onSelect(location)
      onClose()
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelButton}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Location</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Google Places Autocomplete */}
          <View style={styles.autocompleteContainer}>
            {hasApiKey ? (
              <GooglePlacesAutocomplete
                placeholder={placeholder}
                onPress={handleSelect}
                query={{
                  key: apiKey,
                  language: 'en',
                  // components: 'country:us', // Commented out to allow worldwide search
                }}
                fetchDetails={true}
                enablePoweredByContainer={false}
                keepResultsAfterBlur={true}
                styles={{
                  container: styles.placesContainer,
                  textInputContainer: styles.textInputContainer,
                  textInput: styles.textInput,
                  listView: styles.listView,
                  row: styles.row,
                  separator: styles.separator,
                  description: styles.description,
                  predefinedPlacesDescription: styles.predefinedPlacesDescription,
                }}
                textInputProps={{
                  placeholderTextColor: theme.colors.textSecondary,
                  returnKeyType: 'search',
                  autoFocus: true,
                }}
                debounce={300}
                minLength={2}
                filterReverseGeocodingByTypes={['locality', 'administrative_area_level_3']}
                predefinedPlaces={[]}
                predefinedPlacesAlwaysVisible={false}
                renderRow={(rowData) => {
                  const title = rowData.structured_formatting?.main_text || rowData.description
                  const subtitle = rowData.structured_formatting?.secondary_text || ''
                  return (
                    <View style={styles.rowContainer}>
                      <View style={styles.iconContainer}>
                        <MapPin size={hp(2)} color={theme.colors.textSecondary} />
                      </View>
                      <View style={styles.textContainer}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {title}
                        </Text>
                        {subtitle ? (
                          <Text style={styles.rowSubtitle} numberOfLines={1}>
                            {subtitle}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )
                }}
                onFail={(error) => {
                  console.error('Google Places Autocomplete error:', error)
                }}
              />
            ) : (
              <View style={styles.missingKeyState}>
                <Text style={styles.missingKeyTitle}>Location search unavailable</Text>
                <Text style={styles.missingKeyText}>
                  Add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` to enable location search.
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  cancelText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  placeholder: {
    width: wp(20), // Same width as cancel button for centering
  },
  autocompleteContainer: {
    flex: 1,
  },
  placesContainer: {
    flex: 1,
  },
  textInputContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  textInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    height: hp(5.5),
    borderWidth: 1,
    borderColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  listView: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  row: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border || 'rgba(0,0,0,0.1)',
    marginLeft: wp(12), // Align with text (icon + margin)
  },
  description: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  predefinedPlacesDescription: {
    color: theme.colors.textSecondary,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  iconContainer: {
    width: wp(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  rowTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  rowSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(0.2),
  },
  missingKeyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  missingKeyTitle: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
  },
  missingKeyText: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
})
