import { useQuery } from '@tanstack/react-query'
import { getDefaultAvatar } from '../constants/defaultAvatar'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { isRlsRecursionError, logRlsFixHint } from '../utils/rlsHelpers'

const normalizeProfilePhotos = (photos, avatarUrl, yearbookPhotoUrl) => {
  const photoArray = Array.isArray(photos) ? [...photos] : []
  const hasOrdering = photoArray.some((photo) => photo && typeof photo === 'object')
  const orderedPhotos = hasOrdering
    ? photoArray.sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
    : photoArray
  const urls = orderedPhotos
    .map((photo) => {
      if (typeof photo === 'string') return photo
      return photo?.url || photo?.uploadedUrl || null
    })
    .filter(Boolean)

  const primary = yearbookPhotoUrl || avatarUrl
  if (primary && !urls.includes(primary)) {
    urls.unshift(primary)
  }

  return urls
}

/**
 * Hook to fetch the current user's profile
 * Returns profile data including onboarding info, connections count, etc.
 */
export function useCurrentUserProfile() {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: ['currentUserProfile', user?.id],
    queryFn: async () => {
      try {
        if (!user) {
          // Return null instead of throwing to prevent crashes
          console.warn('⚠️ useCurrentUserProfile called without user')
          return null
        }

        console.log('🔍 Fetching profile for user:', user.id, user.email)

        // Fetch profile data
        const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          username,
          bio,
          avatar_url,
          university_id,
          age,
          grade,
          gender,
          major,
          graduation_year,
          interests,
          personality_tags,
          yearbook_visible,
          onboarding_complete,
          profile_completion_percentage,
          humor_style,
          aesthetic,
          study_habits,
          living_habits,
          personality_answers,
          class_schedule,
          yearbook_quote,
          friends_visibility,
          created_at,
          updated_at,
          onboarding_step,
          last_onboarding_update,
          university:universities(
            id,
            name,
            domain
          )
        `)
        .eq('id', user.id)
        .single()

      if (profileError) {
        // Handle case where profile doesn't exist (PGRST116 = no rows returned)
        if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows')) {
          console.warn('⚠️ No profile found for user:', user.id, '- User needs to complete onboarding')
          // Profile doesn't exist - return minimal profile so UI can show onboarding prompt
          return {
            id: user.id,
            email: user.email,
            name: user.email?.split('@')[0] || 'User',
            handle: `@${user.email?.split('@')[0] || 'user'}`,
            onboarding_complete: false,
            connectionsCount: 0,
            location: 'University',
            yearbookQuote: null,
            photos: [],
            yearbookPhotoUrl: null,
            full_name: null,
            username: null,
            bio: null,
            major: null,
            grade: null,
            graduation_year: null,
            interests: null,
            friends_visibility: 'school',
          }
        }
        
        // Handle RLS recursion gracefully so UI can render while backend is fixed
        if (isRlsRecursionError(profileError)) {
          const table = profileError?.message?.match(/relation \"(.+)\"/)?.[1] || 'profiles'
          logRlsFixHint(table)
          return {
            id: user.id,
            email: user.email,
            name: user.email?.split('@')[0] || 'User',
            handle: `@${user.email?.split('@')[0] || 'user'}`,
            onboarding_complete: false,
            connectionsCount: 0,
            location: 'University',
            yearbookQuote: null,
            photos: [],
            yearbookPhotoUrl: null,
            full_name: null,
            username: null,
            bio: null,
            major: null,
            grade: null,
            graduation_year: null,
            interests: null,
            friends_visibility: 'school',
          }
        }
        
        // For other errors, log and throw
        console.error('❌ Error fetching profile:', profileError)
        console.error('Error code:', profileError.code)
        console.error('Error message:', profileError.message)
        console.error('Error details:', profileError.details)
        throw profileError
      }

      if (!profile) {
        console.warn('⚠️ Profile query returned null for user:', user.id)
        // Return minimal profile with default avatar
        const displayName = user.email?.split('@')[0] || 'User'
        const defaultAvatar = getDefaultAvatar(displayName)

        return {
          id: user.id,
          email: user.email,
          name: displayName,
          handle: `@${displayName}`,
          onboarding_complete: false,
          connectionsCount: 0,
          location: 'University',
          yearbookQuote: null,
          photos: [defaultAvatar],
          yearbookPhotoUrl: defaultAvatar,
          avatarUrl: defaultAvatar,
          friends_visibility: 'school',
        }
      }

      console.log('✅ Profile fetched successfully:', {
        id: profile.id,
        name: profile.full_name,
        onboarding_complete: profile.onboarding_complete,
      })

      // Fetch connections count (friends) - count both outgoing and incoming
      const [outgoingResult, incomingResult, mediaResult] = await Promise.all([
        supabase
          .from('relationships')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('relationship_type', 'friend')
          .eq('status', 'accepted'),
        supabase
          .from('relationships')
          .select('*', { count: 'exact', head: true })
          .eq('target_user_id', user.id)
          .eq('relationship_type', 'friend')
          .eq('status', 'accepted'),
        // Fetch profile photos from media table
        supabase
          .from('media')
          .select('id, path, media_type, created_at')
          .eq('owner_id', user.id)
          .eq('owner_type', 'user')
          .in('media_type', ['profile_photo', 'profile_avatar'])
          .order('created_at', { ascending: true })
      ])

      const connectionsCount = (outgoingResult.count || 0) + (incomingResult.count || 0)
      
      // Generate signed URLs for all profile photos
      let profilePhotos = []
      if (mediaResult.data && mediaResult.data.length > 0) {
        const { createSignedUrlForPath } = await import('../helpers/mediaStorage')
        profilePhotos = await Promise.all(
          mediaResult.data
            .filter(m => m.media_type === 'profile_photo')
            .map(async (media) => {
              try {
                const signedUrl = await createSignedUrlForPath(media.path)
                return signedUrl
              } catch (error) {
                console.warn('Failed to get signed URL for media:', media.id, error)
                return null
              }
            })
        )
        profilePhotos = profilePhotos.filter(Boolean)
      }

      // Fetch yearbook quote (if exists in a separate table or as part of profile)
      // For now, we'll check if there's a yearbook_quote field or similar
      // This might need to be added to the profiles table

      // Get display name and default avatar
      const displayName = profile.full_name || profile.email?.split('@')[0] || 'User'
      const defaultAvatar = getDefaultAvatar(displayName)

      // Build final photos array: avatar first, then gallery photos
      const avatarUrl = profile.avatar_url || defaultAvatar
      const allPhotos = [avatarUrl, ...profilePhotos].filter((url, index, self) => 
        url && self.indexOf(url) === index // Remove duplicates
      )

      return {
        ...profile,
        connectionsCount: connectionsCount || 0,
        // Map to expected format
        name: displayName,
        handle: profile.username ? `@${profile.username}` : `@${profile.email?.split('@')[0] || 'user'}`,
        location: profile.university?.name || 'University',
        major: profile.major,
        year: profile.grade || (profile.graduation_year ? `Class of ${profile.graduation_year}` : null),
        graduationYear: profile.graduation_year,
        avatarUrl: avatarUrl,
        yearbookPhotoUrl: avatarUrl,
        photos: allPhotos, // Now includes gallery photos from media table
        // Include all onboarding fields
        age: profile.age,
        gender: profile.gender,
        interests: profile.interests || [],
        personality_tags: profile.personality_tags || [],
        humor_style: profile.humor_style,
        aesthetic: profile.aesthetic,
        study_habits: profile.study_habits,
        living_habits: profile.living_habits,
        personality_answers: profile.personality_answers,
        class_schedule: profile.class_schedule,
        onboarding_step: profile.onboarding_step,
        profile_completion_percentage: profile.profile_completion_percentage || 0,
        // Yearbook quote would come from a separate field if it exists
        yearbookQuote: profile.yearbook_quote || null,
      }
    } catch (error) {
        // Catch any unexpected errors to prevent crashes
        console.error('❌ Unexpected error in useCurrentUserProfile:', error)
        // Return minimal profile instead of throwing
        const displayName = user?.email?.split('@')[0] || 'User'
        return {
          id: user?.id || null,
          email: user?.email || null,
          name: displayName,
          handle: `@${displayName}`,
          onboarding_complete: false,
          connectionsCount: 0,
          location: 'University',
          yearbookQuote: null,
          photos: [],
          yearbookPhotoUrl: null,
          full_name: null,
          username: null,
          bio: null,
          major: null,
          grade: null,
          graduation_year: null,
          interests: null,
        }
      }
    },
    enabled: !!user && !!user.id, // Only run when user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on network errors or RLS errors
      if (error?.code === 'PGRST116' || error?.code === '42P17') {
        return false
      }
      // Retry up to 1 time for other errors
      return failureCount < 1
    },
    retryOnMount: false, // Don't retry on mount to prevent crashes
    refetchOnWindowFocus: false, // Don't refetch on focus to prevent crashes
  })
}
