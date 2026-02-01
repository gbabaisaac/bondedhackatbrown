import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ONBOARDING_THEME } from '../../../constants/onboardingTheme'
import { hp, wp } from '../../../helpers/common'
import { ONBOARDING_STEPS } from '../../../stores/onboardingStore'

const PersonalityStep = ({ formData, updateFormData, onScroll }) => {
  const styles = createStyles(ONBOARDING_THEME)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState(formData.personalityAnswers || {})

  const personalityQuestions = [
    {
      id: 'weekend-style',
      question: 'What\'s your ideal weekend?',
      options: [
        { value: 'adventure', label: 'Adventure - Exploring new places and activities' },
        { value: 'relax', label: 'Relax - Chilling at home, catching up on rest' },
        { value: 'social', label: 'Social - Hanging out with friends, parties' },
        { value: 'productive', label: 'Productive - Working on projects, learning' },
      ],
    },
    {
      id: 'social-energy',
      question: 'How do you recharge your social energy?',
      options: [
        { value: 'alone-time', label: 'Alone Time - I need quiet time to recharge' },
        { value: 'small-groups', label: 'Small Groups - A few close friends' },
        { value: 'big-groups', label: 'Big Groups - I love being around lots of people' },
        { value: 'mixed', label: 'Mixed - It depends on my mood' },
      ],
    },
    {
      id: 'conflict-style',
      question: 'How do you handle disagreements?',
      options: [
        { value: 'direct', label: 'Direct - I address issues head-on' },
        { value: 'diplomatic', label: 'Diplomatic - I try to find middle ground' },
        { value: 'avoid', label: 'Avoid - I prefer to let things cool off first' },
        { value: 'communicate', label: 'Communicate - I talk it through calmly' },
      ],
    },
    {
      id: 'decision-making',
      question: 'How do you make decisions?',
      options: [
        { value: 'quick', label: 'Quick - I trust my gut and decide fast' },
        { value: 'thoughtful', label: 'Thoughtful - I take time to consider options' },
        { value: 'research', label: 'Research - I gather info before deciding' },
        { value: 'collaborative', label: 'Collaborative - I like to discuss with others' },
      ],
    },
    {
      id: 'stress-response',
      question: 'How do you handle stress?',
      options: [
        { value: 'exercise', label: 'Exercise - I work it out physically' },
        { value: 'talk', label: 'Talk - I reach out to friends or family' },
        { value: 'alone', label: 'Alone - I need space to process' },
        { value: 'distract', label: 'Distract - I do something fun to take my mind off' },
      ],
    },
    {
      id: 'communication-style',
      question: 'What\'s your communication style?',
      options: [
        { value: 'text-heavy', label: 'Text Heavy - I prefer texting/messaging' },
        { value: 'call', label: 'Call - I like phone or video calls' },
        { value: 'in-person', label: 'In-Person - I prefer face-to-face' },
        { value: 'mixed', label: 'Mixed - I use different methods for different things' },
      ],
    },
  ]

  const currentQuestion = personalityQuestions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestion.id]

  const handleAnswer = (value) => {
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: value,
    }
    setAnswers(newAnswers)
    
    // Update store immediately
    updateFormData(ONBOARDING_STEPS.PERSONALITY, {
      personalityAnswers: newAnswers,
    })

    // Move to next question after a brief delay
    setTimeout(() => {
      if (currentQuestionIndex < personalityQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
      }
    }, 300)
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const progress = ((currentQuestionIndex + 1) / personalityQuestions.length) * 100

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
      bounces={true}
    >
      <Text style={styles.title}>Personality Quiz</Text>
      <Text style={styles.subtitle}>Answer a few questions to find compatible matches (optional)</Text>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {currentQuestionIndex + 1} of {personalityQuestions.length}
        </Text>
      </View>

      {/* Question */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </View>

      {/* Answer Options */}
      <View style={styles.optionsContainer}>
        {currentQuestion.options.map((option) => {
          const isSelected = currentAnswer === option.value
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => handleAnswer(option.value)}
              activeOpacity={0.7}
              delayPressIn={0}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Navigation */}
      {currentQuestionIndex > 0 && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handlePrevious}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Previous</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

export default PersonalityStep

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: hp(2),
    paddingBottom: hp(20), // Extra padding for fixed navigation buttons at bottom
  },
  title: {
    fontSize: hp(4),
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'System',
    marginBottom: hp(1),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: hp(2.2),
    color: '#8E8E8E',
    fontFamily: 'System',
    marginBottom: hp(4),
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: hp(4),
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: hp(0.6),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: hp(1),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A45CFF',
    borderRadius: 9999,
  },
  progressText: {
    fontSize: hp(1.8),
    color: '#8E8E8E',
    fontFamily: 'System',
  },
  questionContainer: {
    marginBottom: hp(4),
    paddingHorizontal: wp(2),
  },
  questionText: {
    fontSize: hp(3),
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: hp(4),
  },
  optionsContainer: {
    gap: hp(2),
    marginBottom: hp(4),
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: hp(2.5),
    paddingHorizontal: wp(5),
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionButtonSelected: {
    backgroundColor: '#A45CFF15',
    borderColor: '#A45CFF',
  },
  optionText: {
    fontSize: hp(2),
    color: '#1A1A1A',
    fontFamily: 'System',
    flex: 1,
    lineHeight: hp(2.8),
  },
  optionTextSelected: {
    color: '#A45CFF',
    fontWeight: '600',
  },
  checkmark: {
    width: hp(3),
    height: hp(3),
    borderRadius: hp(1.5),
    backgroundColor: '#A45CFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: wp(3),
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: hp(1.8),
    fontWeight: 'bold',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    marginTop: hp(2),
  },
  backButtonText: {
    fontSize: hp(2),
    color: '#A45CFF',
    fontFamily: 'System',
    fontWeight: '600',
  },
})
