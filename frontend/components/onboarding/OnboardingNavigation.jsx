import { StyleSheet, View } from 'react-native'
import { ONBOARDING_THEME } from '../../constants/onboardingTheme'
import { hp, wp } from '../../helpers/common'
import Button from '../Button'

const OnboardingNavigation = ({
  isFirstStep,
  canContinue,
  onContinue,
  onBack,
  isSaving,
}) => {
  const styles = createStyles(ONBOARDING_THEME)
  return (
    <View style={styles.container}>
      {/* Continue Button */}
      <View style={styles.primaryButtons}>
        <Button
          title={isSaving ? "Saving..." : "Continue"}
          onPress={onContinue}
          disabled={!canContinue || isSaving}
          buttonStyle={[
            styles.button,
            styles.continueButton,
            (!canContinue || isSaving) && styles.buttonDisabled,
          ]}
          textStyle={(!canContinue || isSaving) && styles.buttonDisabledText}
          theme={ONBOARDING_THEME}
          hasShadow={false}
        />
      </View>
    </View>
  )
}

export default OnboardingNavigation

const createStyles = (theme) => StyleSheet.create({
  container: {
    paddingBottom: hp(2),
  },
  primaryButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },
  button: {
    width: '90%',
    paddingVertical: hp(1.4),
    borderRadius: 14,
  },
  continueButton: {
    backgroundColor: theme.colors.bondedPurple,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.5,
  },
  buttonDisabledText: {
    color: '#8E8E8E',
  },
})
