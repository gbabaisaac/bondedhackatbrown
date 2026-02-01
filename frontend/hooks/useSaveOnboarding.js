import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadPhotosToSupabase } from '../helpers/uploadPhotos'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

/**
 * Hook to save onboarding data to the profile
 * Supports partial updates - saves whatever data is provided
 */
export const useSaveOnboarding = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const logDebug = (...args) => {
    if (__DEV__) console.log(...args)
  }
  const logError = (...args) => {
    if (__DEV__) console.error(...args)
  }

  return useMutation({
    mutationFn: async ({ formData, completedSteps, completionPercentage }) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to save onboarding data')
      }

      // 1. Resolve university_id first (we need it for photo paths if profile doesn't exist yet)
      let universityId = null
      if (formData.school) {
        // Try to find university by name or domain
        const { data: university, error: uniError } = await supabase
          .from('universities')
          .select('id')
          .or(`name.ilike.%${formData.school}%,domain.ilike.%${formData.school}%`)
          .limit(1)
          .maybeSingle()

        if (uniError) {
          console.warn('⚠️ Error looking up university:', uniError.message)
        }

        if (university?.id) {
          universityId = university.id
          console.log('✅ Resolved university_id for photo upload:', universityId)
        } else if (formData.school.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          // If school is already a UUID, use it directly
          universityId = formData.school
        }
      }

      // Upload photos if present and not already uploaded
      let uploadedPhotos = formData.photos || []
      let photoUploadError = null
      if (formData.photos && formData.photos.length > 0) {
        const needsUpload = formData.photos.some(photo => !photo.uploadedUrl)
        if (needsUpload) {
          if (!universityId) {
            console.warn('⚠️ Skipping photo upload - university_id not yet resolved. Photos will be uploaded once a school is selected.')
            photoUploadError = 'Photos will be uploaded once you select your school.'
          } else {
            console.log(`📸 Uploading ${formData.photos.length} photo(s) to Supabase...`)
            try {
              uploadedPhotos = await uploadPhotosToSupabase(formData.photos, user.id, universityId)
              const uploadedCount = uploadedPhotos.filter(p => p.uploadedUrl).length
              console.log(`✅ Successfully uploaded ${uploadedCount} photo(s)`)

              // Update formData with uploaded photos to prevent re-upload
              formData.photos = uploadedPhotos

              // Check if some photos failed to upload
              const failedCount = formData.photos.length - uploadedCount
              if (failedCount > 0) {
                photoUploadError = `${failedCount} photo(s) failed to upload. They will be retried automatically.`
                console.warn(`⚠️ ${failedCount} photo(s) failed to upload`)
              }
            } catch (error) {
              console.error('❌ Photo upload failed:', error)
              // Don't throw - allow onboarding to continue even if photos fail
              // Photos will be retried on next save
              photoUploadError = 'Photos failed to upload. They will be retried automatically.'
              console.warn('⚠️ Continuing onboarding without photos - will retry on next save')
            }
          }
        } else {
          console.log('✅ All photos already uploaded, skipping upload step')
        }
      }

      // Prepare update object (only include fields that have values)
      const updateData = {
        last_onboarding_update: new Date().toISOString(),
        profile_completion_percentage: completionPercentage,
      }

      // Add photos if uploaded
      if (uploadedPhotos.length > 0) {
        // Set avatar URL (use yearbook photo or first photo)
        const yearbookPhoto = uploadedPhotos.find(p => p.isYearbookPhoto) || uploadedPhotos[0]
        if (yearbookPhoto?.uploadedUrl) {
          updateData.avatar_url = yearbookPhoto.uploadedUrl
        } else if (uploadedPhotos[0]?.uploadedUrl) {
          updateData.avatar_url = uploadedPhotos[0].uploadedUrl
        }

        // Note: profiles table doesn't have 'photos' or 'yearbook_photo_url' columns
        // Photos are stored in the media table via uploadImageToBondedMedia
        // avatar_url is the only photo field in profiles
      }

      // Add basic info if present
      if (universityId) {
        updateData.university_id = universityId
      }
      // Combine first and last name into full_name
      if (formData.firstName && formData.lastName) {
        updateData.full_name = `${formData.firstName.trim()} ${formData.lastName.trim()}`
      } else if (formData.firstName) {
        updateData.full_name = formData.firstName.trim()
      } else if (formData.lastName) {
        updateData.full_name = formData.lastName.trim()
      } else if (formData.fullName) {
        // Fallback for old data format
        updateData.full_name = formData.fullName.trim()
      }
      if (formData.username) updateData.username = formData.username.toLowerCase().trim()
      if (formData.age) updateData.age = formData.age
      if (formData.grade) updateData.grade = formData.grade
      if (formData.gender) updateData.gender = formData.gender
      if (formData.major) updateData.major = formData.major

      // Add optional fields if present
      if (formData.interests?.length > 0) {
        updateData.interests = formData.interests
      }
      if (formData.personalityTags?.length > 0) {
        updateData.personality_tags = formData.personalityTags
      }
      if (formData.humorStyle) updateData.humor_style = formData.humorStyle
      if (formData.aesthetic) updateData.aesthetic = formData.aesthetic
      if (formData.studyHabits) updateData.study_habits = formData.studyHabits
      if (formData.livingHabits) updateData.living_habits = formData.livingHabits
      if (formData.personalityAnswers && Object.keys(formData.personalityAnswers).length > 0) {
        updateData.personality_answers = formData.personalityAnswers
      }
      if (formData.classSchedule) updateData.class_schedule = formData.classSchedule

      // Save yearbook quote if provided
      if (formData.yearbookQuote) {
        updateData.yearbook_quote = formData.yearbookQuote.trim()
      }

      // Set onboarding step to the last completed step
      if (completedSteps?.length > 0) {
        updateData.onboarding_step = completedSteps[completedSteps.length - 1]
      }

      // Mark onboarding as complete if all REQUIRED steps are done
      // Note: We use the same metadata logic as the store
      const mandatorySteps = ['basic_info', 'photos'] // Standard required steps
      const isComplete = mandatorySteps.every(step => completedSteps.includes(step))

      if (isComplete) {
        updateData.onboarding_complete = true
      }

      logDebug('🧾 Onboarding upsert meta:', {
        userId: user.id,
        hasEmail: !!user.email,
        hasUniversityId: !!universityId,
        completedStepsCount: completedSteps?.length || 0,
        completionPercentage,
      })
      logDebug('🧾 Onboarding upsert payload keys:', Object.keys(updateData))

      // Use upsert to create profile if it doesn't exist, or update if it does
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          ...updateData,
        }, {
          onConflict: 'id',
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505' && error.message.includes('profiles_username_key')) {
          console.error('❌ Username taken:', formData.username)
          const usernameTakenError = new Error('This username is already taken. Please pick another one.')
          usernameTakenError.code = 'USERNAME_TAKEN'
          throw usernameTakenError
        }
        logError('❌ Onboarding save failed (supabase error):', {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          status: error?.status,
        })
        logError('❌ Onboarding save failed (raw error):', error)
        throw error
      }

      // Return profile data along with any photo upload errors for UI feedback
      return { profile: data, photoUploadError }
    },
    onSuccess: (data) => {
      // Invalidate profile queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile', user?.id] })
      console.log('✅ Profile queries invalidated after onboarding save')
    },
  })
}
