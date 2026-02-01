import React, { useEffect, useState } from 'react'
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Image,
  ScrollView,
  Pressable,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'
import DraggableElement from './DraggableElement'

const TEXT_COLORS = [
  '#FFFFFF',
  '#000000',
  '#FF6B9D',
  '#C239B3',
  '#A45CFF',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#e74c3c',
  '#FFD700',
]

const BACKGROUND_COLORS = [
  'transparent',
  'rgba(0, 0, 0, 0.5)',
  'rgba(255, 107, 157, 0.5)',
  'rgba(194, 57, 179, 0.5)',
  'rgba(164, 92, 255, 0.5)',
]

const STICKERS = [
  '😀',
  '😂',
  '😍',
  '🥳',
  '😎',
  '🔥',
  '💯',
  '✨',
  '⭐',
  '❤️',
  '👍',
  '🎉',
  '📚',
  '☕',
  '🎓',
  '💪',
  '🏆',
  '🎵',
  '📸',
  '🌟',
]

export default function StoryEditor({
  visible,
  imageUri,
  forumId,
  forumName,
  onClose,
  onPost,
}) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [textElements, setTextElements] = useState([])
  const [stickerElements, setStickerElements] = useState([])
  const [isAddingText, setIsAddingText] = useState(false)
  const [currentText, setCurrentText] = useState('')
  const [currentTextColor, setCurrentTextColor] = useState('#FFFFFF')
  const [currentBgColor, setCurrentBgColor] = useState('transparent')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [textSize, setTextSize] = useState(24)
  const [selectedElementId, setSelectedElementId] = useState(null)
  const [selectedElementType, setSelectedElementType] = useState(null) // 'text' or 'sticker'
  const [showPalette, setShowPalette] = useState(true)
  const [paletteExpanded, setPaletteExpanded] = useState(false)

  const addTextElement = () => {
    if (!currentText.trim()) return

    const newId = Date.now()
    setTextElements((prev) => [
      ...prev,
      {
        id: newId,
        text: currentText,
        color: currentTextColor,
        backgroundColor: currentBgColor,
        size: textSize,
        x: wp(50) - 50,
        y: hp(40) - 20,
        scale: 1,
        rotation: 0,
      },
    ])
    setCurrentText('')
    setIsAddingText(false)
    setSelectedElementId(newId)
    setSelectedElementType('text')
  }

  const addSticker = (emoji) => {
    const newId = Date.now()
    setStickerElements((prev) => [
      ...prev,
      {
        id: newId,
        emoji,
        x: wp(50) - 24,
        y: hp(40) - 24,
        size: 48,
        scale: 1,
        rotation: 0,
      },
    ])
    setShowStickerPicker(false)
    setSelectedElementId(newId)
    setSelectedElementType('sticker')
  }

  const removeTextElement = (id) => {
    setTextElements((prev) => prev.filter((t) => t.id !== id))
    if (selectedElementId === id) {
      setSelectedElementId(null)
      setSelectedElementType(null)
    }
  }

  const removeStickerElement = (id) => {
    setStickerElements((prev) => prev.filter((s) => s.id !== id))
    if (selectedElementId === id) {
      setSelectedElementId(null)
      setSelectedElementType(null)
    }
  }

  const updateTextElement = (id, updates) => {
    setTextElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
    )
  }

  const updateStickerElement = (id, updates) => {
    setStickerElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
    )
  }

  const handlePost = () => {
    onPost({
      imageUri,
      textElements,
      stickerElements,
      forumId,
    })
  }

  // Auto-hide palette after inactivity
  useEffect(() => {
    if (!showPalette) return
    const timer = setTimeout(() => setShowPalette(false), 4000)
    return () => clearTimeout(timer)
  }, [showPalette, paletteExpanded, selectedElementId, selectedElementType])

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Canvas - Image with overlays */}
        <Pressable
          style={styles.canvas}
          onPress={() => {
            setSelectedElementId(null)
            setSelectedElementType(null)
            setShowPalette(true)
          }}
        >
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />

          {/* Text overlays */}
          {textElements.map((textEl) => (
            <DraggableElement
              key={textEl.id}
              initialX={textEl.x}
              initialY={textEl.y}
              initialScale={textEl.scale || 1}
              initialRotation={textEl.rotation || 0}
              isSelected={selectedElementId === textEl.id && selectedElementType === 'text'}
              onUpdate={(updates) => updateTextElement(textEl.id, updates)}
              onDelete={() => removeTextElement(textEl.id)}
            >
              <Pressable
                onPress={() => {
                  setSelectedElementId(textEl.id)
                  setSelectedElementType('text')
                }}
              >
                <View
                  style={[
                    styles.textWrapper,
                    {
                      backgroundColor: textEl.backgroundColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.textElementText,
                      {
                        color: textEl.color,
                        fontSize: textEl.size * (textEl.scale || 1),
                      },
                    ]}
                  >
                    {textEl.text}
                  </Text>
                </View>
              </Pressable>
            </DraggableElement>
          ))}

          {/* Sticker overlays */}
          {stickerElements.map((sticker) => (
            <DraggableElement
              key={sticker.id}
              initialX={sticker.x}
              initialY={sticker.y}
              initialScale={sticker.scale || 1}
              initialRotation={sticker.rotation || 0}
              isSelected={selectedElementId === sticker.id && selectedElementType === 'sticker'}
              onUpdate={(updates) => updateStickerElement(sticker.id, updates)}
              onDelete={() => removeStickerElement(sticker.id)}
            >
              <Pressable
                onPress={() => {
                  setSelectedElementId(sticker.id)
                  setSelectedElementType('sticker')
                }}
              >
                <Text
                  style={{
                    fontSize: (sticker.size || 48) * (sticker.scale || 1),
                  }}
                >
                  {sticker.emoji}
                </Text>
              </Pressable>
            </DraggableElement>
          ))}
        </Pressable>

        {/* Floating palette */}
        {showPalette && (
          <DraggableElement
            initialX={wp(55)}
            initialY={hp(68)}
            initialScale={1}
            initialRotation={0}
            isSelected={false}
          >
            <BlurView intensity={60} tint={theme.mode === 'dark' ? 'dark' : 'light'} style={styles.palette}>
              <TouchableOpacity
                onPress={() => setPaletteExpanded((prev) => !prev)}
                style={styles.paletteToggle}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={paletteExpanded ? 'chevron-down' : 'ellipsis-horizontal'}
                  size={hp(2.2)}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
              {paletteExpanded && (
                <View style={styles.paletteRow}>
                  <TouchableOpacity
                    style={styles.paletteButton}
                    onPress={() => {
                      setIsAddingText(true)
                      setShowPalette(true)
                    }}
                  >
                    <Ionicons name="text-outline" size={hp(2.2)} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.paletteButton}
                    onPress={() => {
                      setShowStickerPicker(true)
                      setShowPalette(true)
                    }}
                  >
                    <Ionicons name="happy-outline" size={hp(2.2)} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.paletteButton}
                    onPress={() => setShowColorPicker((prev) => !prev)}
                  >
                    <View style={[styles.colorPreview, { backgroundColor: currentTextColor, borderColor: theme.colors.textPrimary }]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.paletteButton} onPress={handlePost}>
                    <Ionicons name="checkmark" size={hp(2.4)} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.paletteButton} onPress={onClose}>
                    <Ionicons name="close" size={hp(2.4)} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              )}
            </BlurView>
          </DraggableElement>
        )}

        {/* Text Input Modal */}
        {isAddingText && (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.textInputOverlay}>
              <Pressable
                style={styles.textInputContainer}
                onPress={(e) => e.stopPropagation()}
              >
              <TextInput
                value={currentText}
                onChangeText={setCurrentText}
                placeholder="Type something..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                style={[
                  styles.textInput,
                  {
                    color: currentTextColor,
                    fontSize: textSize,
                    backgroundColor: currentBgColor,
                  },
                ]}
                multiline
                autoFocus
              />

              {/* Text size controls */}
              <View style={styles.sizeControls}>
                <TouchableOpacity
                  onPress={() => setTextSize(Math.max(16, textSize - 4))}
                  style={styles.sizeButton}
                >
                  <Ionicons name="remove" size={hp(2)} color={theme.colors.white} />
                </TouchableOpacity>
                <Text style={styles.sizeText}>{textSize}</Text>
                <TouchableOpacity
                  onPress={() => setTextSize(Math.min(48, textSize + 4))}
                  style={styles.sizeButton}
                >
                  <Ionicons name="add" size={hp(2)} color={theme.colors.white} />
                </TouchableOpacity>
              </View>

              {/* Color options */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.colorOptions}
              >
                {TEXT_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      currentTextColor === color && styles.colorOptionActive,
                    ]}
                    onPress={() => setCurrentTextColor(color)}
                  />
                ))}
              </ScrollView>

              {/* Background color options */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.colorOptions}
              >
                {BACKGROUND_COLORS.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color === 'transparent' ? theme.colors.white : color },
                      color === 'transparent' && { borderWidth: 2, borderColor: theme.colors.white },
                      currentBgColor === color && styles.colorOptionActive,
                    ]}
                    onPress={() => setCurrentBgColor(color)}
                  />
                ))}
              </ScrollView>

              <View style={styles.textInputActions}>
                <TouchableOpacity
                  style={styles.textCancelButton}
                  onPress={() => {
                    setIsAddingText(false)
                    setCurrentText('')
                    Keyboard.dismiss()
                  }}
                >
                  <Text style={styles.textCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.textDoneButton}
                  onPress={() => {
                    addTextElement()
                    Keyboard.dismiss()
                  }}
                >
                  <Text style={styles.textDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* Sticker Picker */}
        {showStickerPicker && (
          <View style={styles.stickerPickerOverlay}>
            <View style={styles.stickerPickerContainer}>
              <View style={styles.stickerPickerHeader}>
                <Text style={styles.stickerPickerTitle}>Choose Sticker</Text>
                <TouchableOpacity onPress={() => setShowStickerPicker(false)}>
                  <Ionicons name="close" size={hp(2.5)} color={theme.colors.white} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.stickerGrid}>
                {STICKERS.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.stickerOption}
                    onPress={() => addSticker(emoji)}
                  >
                    <Text style={styles.stickerEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerButton: {
    width: hp(3),
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weights.bold,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    opacity: theme.ui.metaOpacity,
    marginTop: theme.spacing.xs,
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textElement: {
    position: 'absolute',
  },
  textWrapper: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  textElementText: {
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  stickerElement: {
    position: 'absolute',
  },
  toolbar: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: hp(1.5),
  },
  toolbarContent: {
    paddingHorizontal: wp(4),
    gap: wp(4),
  },
  toolButton: {
    alignItems: 'center',
    gap: hp(0.5),
  },
  toolButtonText: {
    fontSize: hp(1.3),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
  },
  colorPreview: {
    width: hp(3),
    height: hp(3),
    borderRadius: hp(1.5),
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  textInputOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    paddingHorizontal: wp(6),
  },
  textInputContainer: {
    gap: hp(2),
  },
  textInput: {
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderRadius: theme.radius.lg,
    minHeight: hp(8),
  },
  sizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(4),
  },
  sizeButton: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeText: {
    fontSize: hp(1.8),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    minWidth: wp(8),
    textAlign: 'center',
  },
  colorOptions: {
    flexDirection: 'row',
    gap: wp(3),
    paddingVertical: hp(1),
  },
  colorOption: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: theme.colors.white,
    borderWidth: 3,
  },
  textInputActions: {
    flexDirection: 'row',
    gap: wp(3),
    marginTop: hp(1),
  },
  textCancelButton: {
    flex: 1,
    paddingVertical: hp(1.5),
    alignItems: 'center',
    borderRadius: theme.radius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  textCancelText: {
    fontSize: hp(1.8),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
  },
  textDoneButton: {
    flex: 1,
    paddingVertical: hp(1.5),
    alignItems: 'center',
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.bondedPurple,
  },
  textDoneText: {
    fontSize: hp(1.8),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  stickerPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  stickerPickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingBottom: hp(3),
  },
  stickerPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
  },
  stickerPickerTitle: {
    fontSize: hp(2),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: wp(6),
    gap: wp(3),
  },
  stickerOption: {
    width: wp(15),
    height: wp(15),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.radius.lg,
  },
  stickerEmoji: {
    fontSize: hp(4),
  },
})

