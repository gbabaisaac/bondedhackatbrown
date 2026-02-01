import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, ScrollView } from 'react-native'
import { hp, wp } from '../helpers/common'
import { useAppTheme } from '../app/theme'
import { ChevronRight } from './Icons'

/**
 * Color Picker Component
 * Allows users to pick custom RGB colors for events/tasks
 * Now as a dropdown/modal picker
 */
export default function ColorPicker({ value, onChange, label = 'Color' }) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [customHex, setCustomHex] = useState(value || '#A45CFF')
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Predefined color palette (Google Calendar inspired + extras)
  const presetColors = [
    { hex: '#A45CFF', name: 'Purple' },
    { hex: '#34C759', name: 'Green' },
    { hex: '#007AFF', name: 'Blue' },
    { hex: '#FF9500', name: 'Orange' },
    { hex: '#FF3B30', name: 'Red' },
    { hex: '#FF69B4', name: 'Pink' },
    { hex: '#00CED1', name: 'Turquoise' },
    { hex: '#FFD700', name: 'Gold' },
    { hex: '#8B4513', name: 'Brown' },
    { hex: '#808080', name: 'Gray' },
    { hex: '#4B0082', name: 'Indigo' },
    { hex: '#FF1493', name: 'Deep Pink' },
    { hex: '#00FF00', name: 'Lime' },
    { hex: '#FF4500', name: 'Orange Red' },
    { hex: '#1E90FF', name: 'Dodger Blue' },
    { hex: '#FF6347', name: 'Tomato' },
    { hex: '#9370DB', name: 'Medium Purple' },
    { hex: '#20B2AA', name: 'Light Sea Green' },
    { hex: '#FFA500', name: 'Orange' },
    { hex: '#DC143C', name: 'Crimson' },
  ]

  const handlePresetColorSelect = (color) => {
    onChange(color)
    setShowColorPicker(false)
  }

  const handleCustomColorSubmit = () => {
    // Validate hex color
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (!hexRegex.test(customHex)) {
      Alert.alert('Invalid Color', 'Please enter a valid hex color (e.g., #FF5733)')
      return
    }
    onChange(customHex)
    setShowCustomInput(false)
    setShowColorPicker(false)
  }

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  const currentColor = value || '#A45CFF'
  const rgb = hexToRgb(currentColor)
  const selectedColorName = presetColors.find(c => c.hex === currentColor)?.name || 'Custom'

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      {/* Color Selection Field (Dropdown) */}
      <TouchableOpacity
        style={styles.colorSelectField}
        onPress={() => setShowColorPicker(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.colorPreviewSmall, { backgroundColor: currentColor }]} />
        <View style={styles.colorInfo}>
          <Text style={styles.colorName}>{selectedColorName}</Text>
          <Text style={styles.colorHexSmall}>{currentColor}</Text>
          {rgb && (
            <Text style={styles.colorRgbSmall}>
              RGB({rgb.r}, {rgb.g}, {rgb.b})
            </Text>
          )}
        </View>
        <ChevronRight size={hp(1.8)} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                <Text style={styles.modalButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Color</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowColorPicker(false)
                }}
              >
                <Text style={[styles.modalButton, styles.modalButtonDone]}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.colorPickerContent}>
              {/* Current Color Preview */}
              <View style={styles.currentColorPreview}>
                <View style={[styles.colorPreviewLarge, { backgroundColor: currentColor }]} />
                <View style={styles.currentColorInfo}>
                  <Text style={styles.currentColorHex}>{currentColor}</Text>
                  {rgb && (
                    <Text style={styles.currentColorRgb}>
                      RGB({rgb.r}, {rgb.g}, {rgb.b})
                    </Text>
                  )}
                </View>
              </View>

              {/* Preset Colors */}
              <Text style={styles.sectionTitle}>Preset Colors</Text>
              <View style={styles.presetColorsGrid}>
                {presetColors.map((color) => {
                  const colorRgb = hexToRgb(color.hex)
                  const isSelected = value === color.hex
                  return (
                    <TouchableOpacity
                      key={color.hex}
                      style={[
                        styles.colorOption,
                        isSelected && styles.colorOptionSelected,
                      ]}
                      onPress={() => handlePresetColorSelect(color.hex)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.colorSwatch, { backgroundColor: color.hex }]} />
                      <View style={styles.colorOptionInfo}>
                        <Text style={styles.colorOptionName}>{color.name}</Text>
                        <Text style={styles.colorOptionHex}>{color.hex}</Text>
                        {colorRgb && (
                          <Text style={styles.colorOptionRgb}>
                            RGB({colorRgb.r}, {colorRgb.g}, {colorRgb.b})
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <View style={styles.colorCheckmark}>
                          <Text style={styles.colorCheckmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Custom Color Input */}
              <Text style={styles.sectionTitle}>Custom Color</Text>
              <TouchableOpacity
                style={styles.customColorToggle}
                onPress={() => setShowCustomInput(!showCustomInput)}
                activeOpacity={0.7}
              >
                <Text style={styles.customColorToggleText}>
                  {showCustomInput ? 'Hide' : 'Show'} Custom Color Input
                </Text>
                <ChevronRight 
                  size={hp(1.8)} 
                  color={theme.colors.textSecondary}
                  style={{ transform: [{ rotate: showCustomInput ? '90deg' : '0deg' }] }}
                />
              </TouchableOpacity>

              {showCustomInput && (
                <View style={styles.customColorInputContainer}>
                  <Text style={styles.customColorLabel}>Enter Hex Color:</Text>
                  <View style={styles.customColorInputRow}>
                    <TextInput
                      style={styles.customColorInput}
                      value={customHex}
                      onChangeText={(text) => {
                        // Auto-add # if missing
                        const formatted = text.startsWith('#') ? text : `#${text}`
                        setCustomHex(formatted.toUpperCase())
                      }}
                      placeholder="#FF5733"
                      placeholderTextColor={theme.colors.textSecondary}
                      maxLength={7}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={styles.customColorPreviewButton}
                      onPress={handleCustomColorSubmit}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.customColorPreviewBox, { backgroundColor: customHex }]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleCustomColorSubmit}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.submitButtonText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                  {(() => {
                    const customRgb = hexToRgb(customHex)
                    return customRgb ? (
                      <Text style={styles.customColorRgb}>
                        RGB({customRgb.r}, {customRgb.g}, {customRgb.b})
                      </Text>
                    ) : null
                  })()}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    marginVertical: hp(0.5),
  },
  label: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorSelectField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: wp(3),
  },
  colorPreviewSmall: {
    width: wp(8),
    height: wp(8),
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  colorInfo: {
    flex: 1,
  },
  colorName: {
    fontSize: hp(1.7),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  colorHexSmall: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(0.2),
  },
  colorRgbSmall: {
    fontSize: hp(1.2),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(0.1),
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalButton: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modalButtonDone: {
    color: theme.colors.bondedPurple,
  },
  modalBody: {
    maxHeight: hp(60),
  },
  colorPickerContent: {
    padding: wp(4),
    paddingBottom: hp(4),
  },
  // Current Color Preview
  currentColorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    padding: wp(4),
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    marginBottom: hp(2),
  },
  colorPreviewLarge: {
    width: wp(12),
    height: wp(12),
    borderRadius: theme.radius.md,
    borderWidth: 3,
    borderColor: theme.colors.border,
  },
  currentColorInfo: {
    flex: 1,
  },
  currentColorHex: {
    fontSize: hp(2),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  currentColorRgb: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(0.3),
  },
  // Section Title
  sectionTitle: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: hp(1.5),
    marginBottom: hp(1),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Preset Colors Grid
  presetColorsGrid: {
    gap: hp(1),
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(3),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    gap: wp(3),
  },
  colorOptionSelected: {
    borderColor: theme.colors.bondedPurple,
    backgroundColor: theme.colors.bondedPurple + '10',
  },
  colorSwatch: {
    width: wp(10),
    height: wp(10),
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  colorOptionInfo: {
    flex: 1,
  },
  colorOptionName: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  colorOptionHex: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(0.2),
  },
  colorOptionRgb: {
    fontSize: hp(1.2),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(0.1),
  },
  colorCheckmark: {
    width: hp(3),
    height: hp(3),
    borderRadius: hp(1.5),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCheckmarkText: {
    fontSize: hp(1.5),
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  // Custom Color Input
  customColorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp(3),
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    marginTop: hp(1),
  },
  customColorToggleText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.bondedPurple,
  },
  customColorInputContainer: {
    marginTop: hp(1.5),
    padding: wp(3),
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
  },
  customColorLabel: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginBottom: hp(0.8),
  },
  customColorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  customColorInput: {
    flex: 1,
    height: hp(4.5),
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: wp(3),
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.charcoal,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  customColorPreviewButton: {
    width: wp(8),
    height: wp(8),
  },
  customColorPreviewBox: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  submitButton: {
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.md,
  },
  submitButtonText: {
    fontSize: hp(1.5),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  customColorRgb: {
    fontSize: hp(1.3),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: hp(0.8),
    fontStyle: 'italic',
  },
})

