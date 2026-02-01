import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

/**
 * Hook to fetch profiles for Yearbook
 * Returns profiles from the same university as the current user
 * Respects RLS policies (campus isolation)
 *
 * OPTIMIZED:
 * - Fetches profiles without gallery photos for fast initial load
 * - Gallery photos are loaded lazily when viewing a profile modal
 */
export function useProfiles(filters = {}) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['profiles', filters, user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('User must be authenticated to view profiles')
      }

      console.log('🎓 Fetching yearbook profiles...')
      const startTime = Date.now()

      // Get user's university first to filter profiles
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', user.id)
        .single()

      if (!userProfile?.university_id) {
        return []
      }

      // Build query - simplified to avoid RLS recursion
      let query = supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          username,
          bio,
          avatar_url,
          age,
          grade,
          gender,
          major,
          graduation_year,
          interests,
          personality_tags,
          yearbook_quote,
          yearbook_visible,
          onboarding_complete,
          created_at,
          university_id
        `)
        .eq('university_id', userProfile.university_id)
        .or('yearbook_visible.eq.true,yearbook_visible.is.null')
        .order('created_at', { ascending: false })
        .limit(100)

      // Apply filters
      if (filters.graduationYear) {
        query = query.eq('graduation_year', filters.graduationYear)
      }
      if (filters.grade) {
        query = query.eq('grade', filters.grade)
      }
      if (filters.major) {
        query = query.eq('major', filters.major)
      }
      if (filters.gender) {
        query = query.eq('gender', filters.gender)
      }
      if (filters.searchQuery) {
        const search = filters.searchQuery.toLowerCase().trim()
        query = query.or(`full_name.ilike.%${search}%,major.ilike.%${search}%,bio.ilike.%${search}%,yearbook_quote.ilike.%${search}%`)
      }
      if (filters.ageMin) {
        query = query.gte('age', filters.ageMin)
      }
      if (filters.ageMax) {
        query = query.lte('age', filters.ageMax)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching profiles:', error)
        throw error
      }

      const fetchTime = Date.now() - startTime
      console.log(`✅ Fetched ${data?.length || 0} profiles in ${fetchTime}ms`)

      // Transform data to match Yearbook component expectations
      // Gallery photos are loaded lazily via useProfilePhotos hook
      return (data || []).map((profile) => ({
        id: profile.id,
        name: profile.full_name || profile.username || 'Anonymous',
        email: profile.email,
        age: profile.age,
        grade: profile.grade,
        gender: profile.gender,
        major: profile.major || 'Undeclared',
        year: profile.graduation_year?.toString() || '2025',
        bio: profile.bio,
        avatar: profile.avatar_url,
        photoUrl: profile.avatar_url, // Required by Yearbook card
        interests: Array.isArray(profile.interests) ? profile.interests : [],
        personalityTags: Array.isArray(profile.personality_tags) ? profile.personality_tags : [],
        university: 'University', // Skip university lookup for speed
        quote: profile.yearbook_quote || profile.bio || 'No quote yet',
        photos: profile.avatar_url ? [profile.avatar_url] : [], // Just avatar initially
      }))
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

/**
 * Hook to fetch gallery photos for a specific profile (lazy loading)
 * Used when user opens a profile modal
 */
export function useProfilePhotos(profileId) {
  return useQuery({
    queryKey: ['profilePhotos', profileId],
    queryFn: async () => {
      if (!profileId) return []

      let mediaData
      try {
        const { data } = await supabase
          .from('media')
          .select('id, path, media_type, created_at')
          .eq('owner_id', profileId)
          .eq('owner_type', 'user')
          .in('media_type', ['profile_photo', 'profile_avatar'])
          .order('created_at', { ascending: true })
        mediaData = data
      } catch (error) {
        return []
      }

      if (!mediaData || mediaData.length === 0) return []

      // Import helper to create signed URLs
      const { createSignedUrlForPath } = await import('../helpers/mediaStorage')

      // Generate signed URLs in parallel
      const urlPromises = mediaData
        .filter(media => media.media_type === 'profile_photo')
        .map(async (media) => {
          try {
            return await createSignedUrlForPath(media.path)
          } catch (error) {
            console.warn('Failed to get signed URL for media:', media.id)
            return null
          }
        })

      const urls = await Promise.all(urlPromises)
      return urls.filter(Boolean)
    },
    enabled: !!profileId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Hook to fetch a single profile by ID
 */
export function useProfile(profileId) {
  return useQuery({
    queryKey: ['profile', profileId],
    queryFn: async () => {
      if (!profileId) return null

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            *,
            university:universities(id, name, domain)
          `)
          .eq('id', profileId)
          .single()

        if (error) {
          return null
        }

        return data
      } catch (error) {
        // Swallow network errors so users don't see techy failures
        return null
      }
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 0,
  })
}

/**
 * Hook to fetch user's organizations/clubs
 * Returns organizations the user is a member of (excluding pending)
 * Uses security definer RPC to bypass RLS for viewing other users' orgs
 */
export function useUserOrganizations(userId) {
  return useQuery({
    queryKey: ['userOrganizations', userId],
    queryFn: async () => {
      if (!userId) return []

      try {
        // Use RPC function to bypass RLS and get user's organizations
        const { data, error } = await supabase
          .rpc('get_user_organizations', { p_user_id: userId })

        if (error) {
          console.warn('Error fetching user organizations:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.warn('Exception fetching user organizations:', error)
        return []
      }
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  })
}
