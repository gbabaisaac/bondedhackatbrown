import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'
import AppHeader from '../AppHeader'
import AppCard from '../AppCard'

export default function AnonymousMessageButton({
  userId,
  userName,
  onSendMessage,
}) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message')
      return
    }

    setIsSending(true)
    try {
      if (onSendMessage) {
        await onSendMessage({
          receiverId: userId,
          content: message.trim(),
          isAnonymous: true,
        })
      }
      setMessage('')
      setIsModalVisible(false)
      Alert.alert('Sent', 'Your anonymous message has been sent')
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="mail-outline"
          size={hp(2)}
          color={theme.colors.bondedPurple}
        />
        <Text style={styles.buttonText}>Message Anonymously</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.container}>
            <AppHeader
              title="Send Anonymous Message"
              rightAction={handleSend}
              rightActionLabel={isSending ? 'Sending...' : 'Send'}
              onBack={() => setIsModalVisible(false)}
            />

            <View style={styles.content}>
              {/* Info Card */}
              <AppCard style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons
                    name="information-circle"
                    size={hp(2.5)}
                    color={theme.colors.bondedPurple}
                  />
                  <Text style={styles.infoTitle}>Anonymous Messaging</Text>
                </View>
                <Text style={styles.infoText}>
                  Your identity will be hidden from the recipient. They will see
                  you as "Bonded Anonymous User" until you choose to reveal
                  yourself.
                </Text>
                <Text style={styles.infoNote}>
                  Note: Bonded moderators can see your identity for safety
                  purposes.
                </Text>
              </AppCard>

              {/* Recipient Info */}
              <View style={styles.recipientCard}>
                <Text style={styles.recipientLabel}>To:</Text>
                <View style={styles.recipientInfo}>
                  <View style={styles.recipientAvatar}>
                    <Text style={styles.recipientAvatarText}>
                      {userName?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={styles.recipientName}>{userName || 'User'}</Text>
                </View>
              </View>

              {/* Message Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Your Message</Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Type your anonymous message here..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>
                  {message.length}/1000
                </Text>
              </View>

              {/* Safety Reminder */}
              <View style={styles.safetyCard}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={hp(2)}
                  color={theme.colors.error}
                />
                <Text style={styles.safetyText}>
                  Be respectful. Harassment or abuse will result in account
                  suspension.
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  )
}

const createStyles = (theme) => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bondedPurple + '10',
    borderWidth: 1,
    borderColor: theme.colors.bondedPurple + '30',
    gap: wp(1.5),
  },
  buttonText: {
    fontSize: hp(1.5),
    fontWeight: '600',
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.body,
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: wp(4),
  },
  infoCard: {
    marginBottom: hp(2),
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1),
  },
  infoTitle: {
    fontSize: hp(1.8),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  infoText: {
    fontSize: hp(1.5),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2.2),
    marginBottom: hp(1),
  },
  infoNote: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  recipientCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recipientLabel: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginBottom: hp(1),
    opacity: 0.7,
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  recipientAvatar: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: theme.colors.bondedPurple,
    opacity: 0.15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientAvatarText: {
    fontSize: hp(1.9),
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  recipientName: {
    fontSize: hp(1.7),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  inputSection: {
    marginBottom: hp(2),
  },
  inputLabel: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(1),
  },
  messageInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: wp(4),
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    minHeight: hp(20),
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
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.radius.md,
    padding: wp(3),
    gap: wp(2),
    borderWidth: 1,
    borderColor: theme.colors.error + '20',
  },
  safetyText: {
    flex: 1,
    fontSize: hp(1.4),
    color: theme.colors.error,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: hp(2),
  },
})

