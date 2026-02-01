import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'

const MIN_OPTIONS = 2
const MAX_OPTIONS = 6

export default function PollBuilder({ poll, onPollChange, onRemove }) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [question, setQuestion] = useState(poll?.question || '')
  const [options, setOptions] = useState(
    poll?.options || ['', '']
  )
  const [hideResults, setHideResults] = useState(
    poll?.hideResultsUntilVote || false
  )
  const [expiresAt, setExpiresAt] = useState(poll?.expiresAt || null)

  const updateOption = (index, value) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
    notifyChange()
  }

  const addOption = () => {
    if (options.length < MAX_OPTIONS) {
      setOptions([...options, ''])
      notifyChange()
    }
  }

  const removeOption = (index) => {
    if (options.length > MIN_OPTIONS) {
      const newOptions = options.filter((_, i) => i !== index)
      setOptions(newOptions)
      notifyChange()
    }
  }

  const notifyChange = () => {
    if (onPollChange) {
      onPollChange({
        question,
        options: options.filter((opt) => opt.trim() !== ''),
        hideResultsUntilVote: hideResults,
        expiresAt,
      })
    }
  }

  const handleQuestionChange = (text) => {
    setQuestion(text)
    setTimeout(() => notifyChange(), 0)
  }

  const handleHideResultsChange = (value) => {
    setHideResults(value)
    setTimeout(() => notifyChange(), 0)
  }

  const validOptions = options.filter((opt) => opt.trim() !== '').length

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="stats-chart-outline"
            size={hp(2.2)}
            color={theme.colors.bondedPurple}
          />
          <Text style={styles.title}>Create Poll</Text>
        </View>
        {onRemove && (
          <TouchableOpacity
            onPress={onRemove}
            style={styles.removeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close-circle"
              size={hp(2.2)}
              color={theme.colors.error}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Question Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Poll Question</Text>
        <TextInput
          style={styles.questionInput}
          placeholder="e.g., Which major is the hardest?"
          placeholderTextColor={theme.colors.softBlack}
          value={question}
          onChangeText={handleQuestionChange}
          multiline
        />
      </View>

      {/* Options */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Options ({validOptions}/{MAX_OPTIONS})
        </Text>
        <ScrollView style={styles.optionsContainer}>
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <View style={styles.optionNumber}>
                <Text style={styles.optionNumberText}>{index + 1}</Text>
              </View>
              <TextInput
                style={styles.optionInput}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor={theme.colors.softBlack}
                value={option}
                onChangeText={(text) => updateOption(index, text)}
              />
              {options.length > MIN_OPTIONS && (
                <TouchableOpacity
                  onPress={() => removeOption(index)}
                  style={styles.removeOptionButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={hp(2)}
                    color={theme.colors.error}
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>

        {options.length < MAX_OPTIONS && (
          <TouchableOpacity
            style={styles.addOptionButton}
            onPress={addOption}
            activeOpacity={0.7}
          >
            <Ionicons
              name="add-circle-outline"
              size={hp(2)}
              color={theme.colors.bondedPurple}
            />
            <Text style={styles.addOptionText}>Add Option</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingLabel}>Hide results until voting</Text>
            <Text style={styles.settingDescription}>
              Results will be hidden until user votes
            </Text>
          </View>
          <Switch
            value={hideResults}
            onValueChange={handleHideResultsChange}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.bondedPurple + '80',
            }}
            thumbColor={
              hideResults ? theme.colors.bondedPurple : theme.colors.white
            }
          />
        </View>
      </View>

      {validOptions < MIN_OPTIONS && (
        <Text style={styles.warning}>
          Poll needs at least {MIN_OPTIONS} options
        </Text>
      )}
    </View>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: wp(4),
    marginVertical: hp(1),
    borderWidth: 1,
    borderColor: theme.colors.bondedPurple + '20',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  title: {
    fontSize: hp(1.9),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  removeButton: {
    padding: hp(0.5),
  },
  section: {
    marginBottom: hp(1.5),
  },
  label: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(1),
  },
  questionInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    padding: wp(3),
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    minHeight: hp(6),
    textAlignVertical: 'top',
  },
  optionsContainer: {
    maxHeight: hp(25),
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
    gap: wp(2),
  },
  optionNumber: {
    width: hp(3),
    height: hp(3),
    borderRadius: hp(1.5),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionNumberText: {
    fontSize: hp(1.4),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
  },
  optionInput: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    padding: wp(3),
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  removeOptionButton: {
    padding: hp(0.5),
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1),
    gap: wp(1.5),
    marginTop: hp(0.5),
  },
  addOptionText: {
    fontSize: hp(1.5),
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flex: 1,
    marginRight: wp(3),
  },
  settingLabel: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    marginBottom: hp(0.3),
  },
  settingDescription: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    opacity: 0.7,
  },
  warning: {
    fontSize: hp(1.3),
    color: theme.colors.error,
    fontFamily: theme.typography.fontFamily.body,
    fontStyle: 'italic',
    marginTop: hp(0.5),
  },
})

