import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'

export default function PollRenderer({
  poll,
  userVote,
  onVote,
  totalVotes = 0,
  voteCounts = [],
}) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [localVote, setLocalVote] = useState(userVote)
  const [hasVoted, setHasVoted] = useState(!!userVote)

  const handleVote = (optionIndex) => {
    if (hasVoted) return

    setLocalVote(optionIndex)
    setHasVoted(true)
    if (onVote) {
      onVote(optionIndex)
    }
  }

  const showResults = !poll.hideResultsUntilVote || hasVoted
  const displayVoteCounts = showResults ? voteCounts : []
  const displayTotalVotes = showResults ? totalVotes : 0

  const getPercentage = (count) => {
    if (displayTotalVotes === 0) return 0
    return (count / displayTotalVotes) * 100
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="stats-chart"
          size={hp(2)}
          color={theme.colors.bondedPurple}
        />
        <Text style={styles.question}>{poll.question}</Text>
      </View>

      <View style={styles.optionsContainer}>
        {poll.options.map((option, index) => {
          const voteCount = displayVoteCounts[index] || 0
          const percentage = getPercentage(voteCount)
          const isSelected = localVote === index
          const isVoted = hasVoted && isSelected

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                hasVoted && !isSelected && styles.optionVoted,
              ]}
              onPress={() => handleVote(index)}
              disabled={hasVoted}
              activeOpacity={0.7}
            >
              {showResults && (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarIOS}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${percentage}%` },
                      ]}
                    />
                  </View>
                </View>
              )}

              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {option}
                </Text>

                {showResults && (
                  <View style={styles.optionStats}>
                    <Text style={styles.optionPercentage}>
                      {percentage.toFixed(1)}%
                    </Text>
                    <Text style={styles.optionVotes}>({voteCount})</Text>
                  </View>
                )}

                {isVoted && (
                  <Ionicons
                    name="checkmark-circle"
                    size={hp(2)}
                    color={theme.colors.white}
                    style={styles.checkIcon}
                  />
                )}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      {showResults && (
        <Text style={styles.totalVotes}>
          {displayTotalVotes} {displayTotalVotes === 1 ? 'vote' : 'votes'}
        </Text>
      )}

      {!hasVoted && poll.hideResultsUntilVote && (
        <Text style={styles.hint}>Vote to see results</Text>
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
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  question: {
    flex: 1,
    fontSize: hp(1.8),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  optionsContainer: {
    gap: hp(1),
  },
  option: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    padding: wp(3),
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  optionSelected: {
    borderColor: theme.colors.bondedPurple,
    backgroundColor: theme.colors.bondedPurple + '10',
  },
  optionVoted: {
    opacity: 0.6,
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: theme.radius.md,
  },
  progressBar: {
    height: '100%',
    width: '100%',
  },
  progressBarIOS: {
    height: '100%',
    width: '100%',
    backgroundColor: theme.colors.bondedPurple + '20',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.bondedPurple + '40',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  optionText: {
    flex: 1,
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: theme.colors.bondedPurple,
    fontWeight: '700',
  },
  optionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    marginLeft: wp(2),
  },
  optionPercentage: {
    fontSize: hp(1.5),
    fontWeight: '700',
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.heading,
  },
  optionVotes: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  checkIcon: {
    marginLeft: wp(2),
  },
  totalVotes: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(1),
    textAlign: 'center',
    opacity: 0.7,
  },
  hint: {
    fontSize: hp(1.3),
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: hp(0.5),
    textAlign: 'center',
    fontStyle: 'italic',
  },
})

