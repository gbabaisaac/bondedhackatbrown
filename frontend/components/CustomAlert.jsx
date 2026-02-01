import React from 'react'
import {
    Animated,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppTheme } from '../app/theme'

const { width: screenWidth } = Dimensions.get('window')

// Alert types with different styles
const ALERT_TYPES = {
  CONFIRM: 'confirm',
  DELETE: 'delete',
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
}

// Icon mapping for different alert types
const ALERT_ICONS = {
  [ALERT_TYPES.CONFIRM]: '❓',
  [ALERT_TYPES.DELETE]: '🗑️',
  [ALERT_TYPES.SUCCESS]: '✅',
  [ALERT_TYPES.ERROR]: '❌',
  [ALERT_TYPES.INFO]: 'ℹ️',
}

export function CustomAlert({
  visible,
  onClose,
  title,
  message,
  type = ALERT_TYPES.CONFIRM,
  buttons = [],
  onButtonPress,
}) {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const fadeAnim = React.useRef(new Animated.Value(0)).current
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  if (!visible) return null

  const getAlertColors = () => {
    switch (type) {
      case ALERT_TYPES.DELETE:
        return {
          background: theme.colors.error + '15',
          border: theme.colors.error,
          icon: theme.colors.error,
          buttonBackground: theme.colors.error,
          buttonText: theme.colors.white,
        }
      case ALERT_TYPES.SUCCESS:
        return {
          background: theme.colors.success + '15',
          border: theme.colors.success,
          icon: theme.colors.success,
          buttonBackground: theme.colors.success,
          buttonText: theme.colors.white,
        }
      case ALERT_TYPES.ERROR:
        return {
          background: theme.colors.error + '15',
          border: theme.colors.error,
          icon: theme.colors.error,
          buttonBackground: theme.colors.error,
          buttonText: theme.colors.white,
        }
      default:
        return {
          background: theme.colors.background,
          border: theme.colors.primary,
          icon: theme.colors.primary,
          buttonBackground: theme.colors.primary,
          buttonText: theme.colors.white,
        }
    }
  }

  const colors = getAlertColors()

  const defaultButtons = type === ALERT_TYPES.DELETE ? [
    {
      text: 'Cancel',
      style: 'cancel',
      onPress: () => onButtonPress('cancel'),
    },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => onButtonPress('delete'),
    },
  ] : buttons

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.icon + '20' }]}>
            <Text style={[styles.icon, { color: colors.icon }]}>
              {ALERT_ICONS[type]}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>

          {/* Message */}
          {message && (
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
              {message}
            </Text>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {defaultButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'destructive' && [
                    styles.buttonDestructive,
                    { backgroundColor: colors.buttonBackground },
                  ],
                  button.style === 'cancel' && styles.buttonCancel,
                ]}
                onPress={() => {
                  Haptics.impactAsync(
                    Haptics.ImpactFeedbackStyle[
                      button.style === 'destructive' ? 'Heavy' : 'Light'
                    ]
                  )
                  button.onPress()
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'destructive' && { color: colors.buttonText },
                    button.style === 'cancel' && { color: theme.colors.textSecondary },
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.colors.background }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary }]}>
              ×
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: screenWidth - 40,
    width: '100%',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDestructive: {
    borderWidth: 1,
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
})
