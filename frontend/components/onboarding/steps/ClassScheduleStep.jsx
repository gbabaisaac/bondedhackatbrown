/**
 * Class Schedule Step - Main component managing schedule import flow
 * Flow: Upload -> Edit -> Confirm -> Save
 */

import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { useCurrentUserProfile } from '../../../hooks/useCurrentUserProfile'
import { useSaveSchedule } from '../../../hooks/useSaveSchedule'
import { ONBOARDING_STEPS } from '../../../stores/onboardingStore'
import { getFriendlyErrorMessage } from '../../../utils/userFacingErrors'
import ScheduleConfirmStep from './ScheduleConfirmStep'
import ScheduleEditStep from './ScheduleEditStep'
import ScheduleUploadStep from './ScheduleUploadStep'

const SCHEDULE_STEPS = {
  UPLOAD: 'upload',
  EDIT: 'edit',
  CONFIRM: 'confirm',
}

export default function ClassScheduleStep({ formData, updateFormData, onScroll }) {
  const [currentStep, setCurrentStep] = useState(SCHEDULE_STEPS.UPLOAD)
  const [parsedSchedule, setParsedSchedule] = useState(
    formData.classSchedule?.parsedSchedule || null
  )
  const [editedCourses, setEditedCourses] = useState([])

  const { data: userProfile } = useCurrentUserProfile()
  const { mutate: saveSchedule, isPending: isSaving } = useSaveSchedule()
  const router = useRouter()

  const handleScheduleParsed = (schedule) => {
    if (schedule && schedule.courses.length > 0) {
      setParsedSchedule(schedule)
      setEditedCourses(schedule.courses)
      setCurrentStep(SCHEDULE_STEPS.EDIT)
    } else {
      // User skipped - mark step as complete and continue
      updateFormData(ONBOARDING_STEPS.CLASS_SCHEDULE, {
        classSchedule: null,
      })
    }
  }

  const handleEditSave = (courses) => {
    setEditedCourses(courses)
    setCurrentStep(SCHEDULE_STEPS.CONFIRM)
  }

  const handleConfirm = async (selectedSections) => {
    if (!userProfile?.university_id) {
      Alert.alert('Error', 'University information is required. Please complete your profile first.')
      return
    }

    if (isSaving) {
      return
    }

    saveSchedule(
      {
        courses: editedCourses,
        selectedSections: Array.from(selectedSections),
        universityId: userProfile.university_id,
      },
      {
        onSuccess: () => {
          // Update form data
          updateFormData(ONBOARDING_STEPS.CLASS_SCHEDULE, {
            classSchedule: {
              scheduleImageUri: formData.classSchedule?.scheduleImageUri || null,
              parsedSchedule,
              courses: editedCourses,
              selectedSections: Array.from(selectedSections),
              rawText: parsedSchedule?.rawText || '',
            },
          })

          Alert.alert('Success', 'Your schedule has been saved!', [
            {
              text: 'OK',
              onPress: () => {
                // Step is complete, onboarding flow will continue
              },
            },
          ])
        },
        onError: (error) => {
          console.error('Error saving schedule:', error)
          Alert.alert(
            'Error',
            getFriendlyErrorMessage(error, 'Failed to save schedule. Please try again.')
          )
        },
      }
    )
  }

  const handleEdit = () => {
    setCurrentStep(SCHEDULE_STEPS.EDIT)
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case SCHEDULE_STEPS.UPLOAD:
        return (
          <ScheduleUploadStep
            formData={formData}
            updateFormData={updateFormData}
            onScroll={onScroll}
            onScheduleParsed={handleScheduleParsed}
          />
        )

      case SCHEDULE_STEPS.EDIT:
        return (
          <ScheduleEditStep courses={editedCourses} onSave={handleEditSave} onScroll={onScroll} />
        )

      case SCHEDULE_STEPS.CONFIRM:
        return (
          <ScheduleConfirmStep
            courses={editedCourses}
            onConfirm={handleConfirm}
            onEdit={handleEdit}
            isSaving={isSaving}
            onScroll={onScroll}
          />
        )

      default:
        return null
    }
  }

  return <View style={styles.container}>{renderCurrentStep()}</View>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
