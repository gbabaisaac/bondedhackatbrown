import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'
import Slider from '@react-native-community/slider'

export default function PreAnswerModal({ visible, topic, subtitle, onClose, onSubmit }) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [answer, setAnswer] = useState('')
  const [confidence, setConfidence] = useState(50)

  const handleSubmit = () => {
    if (answer.trim().length < 10) {
      alert('Please write at least 10 characters')
      return
    }

    onSubmit(answer.trim(), confidence)
    setAnswer('')
    setConfidence(50)
  }

  const characterCount = answer.length
  const maxCharacters = 280
  const isValid = characterCount >= 10 && characterCount <= maxCharacters

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={hp(2.5)} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submit Answer</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.doneButton, !isValid && styles.doneButtonDisabled]}
            disabled={!isValid}
          >
            <Text style={[styles.doneText, !isValid && styles.doneTextDisabled]}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Topic */}
          <View style={styles.topicSection}>
            <Text style={styles.label}>Tonight's Question:</Text>
            <Text style={styles.topicText}>{topic}</Text>
            {subtitle && <Text style={styles.topicSubtitle}>{subtitle}</Text>}
          </View>

          <View style={styles.divider} />

          {/* Answer input */}
          <View style={styles.answerSection}>
            <Text style={styles.label}>Your Initial Take:</Text>

            <TextInput
              style={styles.textInput}
              placeholder="Share your honest opinion..."
              placeholderTextColor={theme.colors.textSecondary}
              value={answer}
              onChangeText={setAnswer}
              multiline
              maxLength={maxCharacters}
              textAlignVertical="top"
            />

            <Text style={[styles.characterCount, !isValid && characterCount > 0 && styles.characterCountError]}>
              {characterCount}/{maxCharacters} characters
              {characterCount > 0 && characterCount < 10 && ' (min 10)'}
            </Text>
          </View>

          {/* Confidence slider */}
          <View style={styles.confidenceSection}>
            <Text style={styles.label}>Rate your confidence (Optional):</Text>
            <Text style={styles.confidenceValue}>{confidence}%</Text>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={confidence}
              onValueChange={setConfidence}
              minimumTrackTintColor={theme.colors.bondedPurple}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.bondedPurple}
            />

            <View style={styles.confidenceLabels}>
              <Text style={styles.confidenceLabel}>Not sure</Text>
              <Text style={styles.confidenceLabel}>Very confident</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Info section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Your answer will:</Text>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={hp(2)} color={theme.colors.bondedPurple} />
              <Text style={styles.infoText}>Show to others in your Circle</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={hp(2)} color={theme.colors.bondedPurple} />
              <Text style={styles.infoText}>Be saved for comparison later</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={hp(2)} color={theme.colors.bondedPurple} />
              <Text style={styles.infoText}>Help track viewpoint changes</Text>
            </View>

            <Text style={styles.updateNote}>💡 You can update it during the Circle</Text>
          </View>

          {/* Submit button (mobile friendly) */}
          <TouchableOpacity
            style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={!isValid}
          >
            <Text style={styles.submitButtonText}>Submit & Join Circle</Text>
            <Ionicons name="arrow-forward" size={hp(2)} color={theme.colors.white} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: hp(0.5),
    width: hp(4),
  },
  headerTitle: {
    fontSize: hp(2),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  doneButton: {
    padding: hp(0.5),
    paddingHorizontal: wp(3),
  },
  doneButtonDisabled: {
    opacity: 0.4,
  },
  doneText: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.body,
  },
  doneTextDisabled: {
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: wp(6),
    paddingBottom: hp(4),
  },
  topicSection: {
    marginBottom: hp(2),
  },
  label: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(1),
    opacity: 0.8,
  },
  topicText: {
    fontSize: hp(2.4),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    lineHeight: hp(3),
    marginBottom: hp(0.5),
  },
  topicSubtitle: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    marginVertical: hp(2.5),
  },
  answerSection: {
    marginBottom: hp(2),
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: wp(4),
    fontSize: hp(1.8),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    minHeight: hp(20),
    borderWidth: 2,
    borderColor: theme.colors.border,
    lineHeight: hp(2.4),
  },
  characterCount: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.6,
    marginTop: hp(1),
    textAlign: 'right',
  },
  characterCountError: {
    color: '#EF4444',
    opacity: 1,
  },
  confidenceSection: {
    marginBottom: hp(2),
  },
  confidenceValue: {
    fontSize: hp(3),
    fontWeight: '700',
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.heading,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  slider: {
    width: '100%',
    height: hp(4),
  },
  confidenceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(0.5),
  },
  confidenceLabel: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.6,
  },
  infoSection: {
    marginBottom: hp(3),
  },
  infoTitle: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(1.5),
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
    gap: wp(2),
  },
  infoText: {
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    flex: 1,
  },
  updateNote: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    fontStyle: 'italic',
    marginTop: hp(1.5),
    padding: wp(3),
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
  },
  submitButton: {
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.xl,
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.bondedPurple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.backgroundSecondary,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: hp(1.9),
    fontWeight: '600',
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
  },
})
