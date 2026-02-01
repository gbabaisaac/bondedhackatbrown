/**
 * Hook for class matching and classmate discovery
 * Matches uploaded classes to course catalog and finds classmates
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { normalizeClassCode } from '../services/scheduleParser'
import { useAuthStore } from '../stores/authStore'

/**
 * Match a class to the course catalog
 * Returns existing class or creates new one
 */
export function useMatchClass() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ classCode, className, sectionNumber = null, professor, semester, termCode, days, startTime, endTime, location }) => {
      if (!user) {
        throw new Error('User must be authenticated')
      }
      
      // Get user's university
      const { data: profile } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', user.id)
        .single()
      
      if (!profile?.university_id) {
        throw new Error('User university not found')
      }
      
      const normalizedCode = normalizeClassCode(classCode)

      // Try to find existing class in classes table (this is what sections/forums/enrollments reference)
      let { data: existingClass } = await supabase
        .from('classes')
        .select('id, class_code, class_name')
        .eq('university_id', profile.university_id)
        .or(`class_code.eq.${classCode},class_code.eq.${normalizedCode}`)
        .maybeSingle()

      let classId

      if (existingClass) {
        classId = existingClass.id

        // Update name if provided and different
        if (className && className !== existingClass.class_name) {
          await supabase
            .from('classes')
            .update({ class_name: className })
            .eq('id', classId)
        }
      } else {
        const { data: newClass, error: createError } = await supabase
          .from('classes')
          .insert({
            university_id: profile.university_id,
            class_code: classCode,
            class_name: className || classCode,
            department: extractDepartment(classCode),
          })
          .select('id')
          .single()

        if (createError) {
          throw createError
        }

        classId = newClass.id
      }
      
      // Find or create class section
      let sectionId = null

      // Only attempt section matching if we have a section number (preferred) or enough section metadata
      if (sectionNumber || professor || days || startTime || location) {
        const resolvedSemester = semester || getCurrentSemester()
        const resolvedTermCode = termCode || getCurrentTermCode()

        let sectionQuery = supabase
          .from('class_sections')
          .select('id')
          .eq('class_id', classId)
          .eq('term_code', resolvedTermCode)

        if (sectionNumber) {
          sectionQuery = sectionQuery.eq('section_number', sectionNumber)
        }

        const { data: existingSection } = await sectionQuery.maybeSingle()

        if (existingSection) {
          sectionId = existingSection.id
        } else if (sectionNumber) {
          const { data: newSection, error: sectionError } = await supabase
            .from('class_sections')
            .insert({
              class_id: classId,
              section_number: sectionNumber,
              professor_name: professor || null,
              semester: resolvedSemester,
              term_code: resolvedTermCode,
              days_of_week: days || [],
              start_time: startTime || null,
              end_time: endTime || null,
              location: location || null,
            })
            .select('id')
            .single()

          if (sectionError) {
            throw sectionError
          }

          sectionId = newSection?.id || null
        }
      }
      
      return {
        classId,
        sectionId,
        class: existingClass || { id: classId, class_code: classCode, class_name: className || classCode }
      }
    },
    onSuccess: () => {
      // Invalidate class-related queries
      queryClient.invalidateQueries(['classes'])
      queryClient.invalidateQueries(['enrollments'])
    }
  })
}

/**
 * Enroll user in a class
 */
export function useEnrollInClass() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ classId, sectionId, semester, termCode }) => {
      if (!user) {
        throw new Error('User must be authenticated')
      }

      const resolvedSemester = semester || getCurrentSemester()
      const resolvedTermCode = termCode || getCurrentTermCode()
      
      // Check if already enrolled
      const { data: existing } = await supabase
        .from('user_class_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('class_id', classId)
        .eq('term_code', resolvedTermCode)
        .limit(1)
        .single()
      
      if (existing) {
        // Already enrolled, just return
        return existing
      }
      
      // Create enrollment
      const { data, error } = await supabase
        .from('user_class_enrollments')
        .insert({
          user_id: user.id,
          class_id: classId,
          section_id: sectionId || null,
          semester: resolvedSemester,
          term_code: resolvedTermCode,
          is_active: true
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollments'])
      queryClient.invalidateQueries(['classmates'])
    }
  })
}

/**
 * Find classmates (users in same classes)
 * Filters by same professor if provided
 */
export function useClassmates(courseId, professorName = null) {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: ['classmates', courseId, professorName, user?.id],
    queryFn: async () => {
      if (!user || !courseId) {
        return []
      }
      
      // Build query to find classmates
      let query = supabase
        .from('user_class_enrollments')
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url,
            major,
            grade
          ),
          section:section_id (
            professor_name
          )
        `)
        .eq('class_id', courseId)
        .eq('is_active', true)
        .neq('user_id', user.id) // Exclude current user
      
      // If professor specified, filter by section
      if (professorName) {
        query = query.eq('section.professor_name', professorName)
      }
      
      const { data, error } = await query
      
      if (error) {
        throw error
      }
      
      // Transform data
      return (data || []).map(enrollment => ({
        userId: enrollment.user_id,
        profile: enrollment.profiles,
        professor: enrollment.section?.professor_name || null
      }))
    },
    enabled: !!user && !!courseId
  })
}

/**
 * Get all classmates across all user's classes
 */
export function useAllClassmates() {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: ['all-classmates', user?.id],
    queryFn: async () => {
      if (!user) {
        return []
      }
      
      // Get user's enrollments
      const { data: enrollments } = await supabase
        .from('user_class_enrollments')
        .select('class_id, section_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      if (!enrollments || enrollments.length === 0) {
        return []
      }
      
      const classIds = enrollments.map(e => e.class_id)
      const sectionIds = enrollments.map(e => e.section_id).filter(Boolean)
      
      // Find all users in same classes
      let query = supabase
        .from('user_class_enrollments')
        .select(`
          user_id,
          class_id,
          section_id,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url,
            major,
            grade
          ),
          class:class_id (
            class_code,
            class_name
          ),
          section:section_id (
            professor_name
          )
        `)
        .in('class_id', classIds)
        .eq('is_active', true)
        .neq('user_id', user.id)
      
      // If sections exist, filter by same section
      if (sectionIds.length > 0) {
        query = query.in('section_id', sectionIds)
      }
      
      const { data, error } = await query
      
      if (error) {
        throw error
      }
      
      // Group by user and collect shared classes
      const classmatesMap = new Map()
      
      data.forEach(enrollment => {
        const userId = enrollment.user_id
        if (!classmatesMap.has(userId)) {
          classmatesMap.set(userId, {
            userId,
            profile: enrollment.profiles,
            sharedClasses: []
          })
        }
        
        const classmate = classmatesMap.get(userId)
        classmate.sharedClasses.push({
          courseCode: enrollment.class?.class_code,
          className: enrollment.class?.class_name,
          professor: enrollment.section?.professor_name
        })
      })
      
      return Array.from(classmatesMap.values())
    },
    enabled: !!user
  })
}

function getCurrentSemester() {
  const now = new Date()
  const month = now.getMonth() // 0-11
  const year = now.getFullYear()

  if (month >= 0 && month <= 4) {
    return `Spring ${year}`
  }
  if (month >= 5 && month <= 7) {
    return `Summer ${year}`
  }
  return `Fall ${year}`
}

function getCurrentTermCode() {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  if (month >= 0 && month <= 4) {
    return `${year}SP`
  }
  if (month >= 5 && month <= 7) {
    return `${year}SU`
  }
  return `${year}FA`
}

/**
 * Helper: Extract department from class code (e.g., "CS201" -> "Computer Science")
 */
function extractDepartment(classCode) {
  const deptMap = {
    'CS': 'Computer Science',
    'MATH': 'Mathematics',
    'ENG': 'English',
    'HIST': 'History',
    'BIO': 'Biology',
    'CHEM': 'Chemistry',
    'PHYS': 'Physics',
    'PSY': 'Psychology',
    'ECON': 'Economics',
    'BUS': 'Business',
    'MKT': 'Marketing',
    'FIN': 'Finance',
    'ACCT': 'Accounting'
  }
  
  const match = classCode.match(/^([A-Z]+)/)
  if (match) {
    return deptMap[match[1]] || match[1]
  }
  
  return null
}

/**
 * Convenience export for Network page - wraps useAllClassmates
 * Returns profiles with shared class info, sorted by most shared classes
 */
export function useClassMatching() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['classmates', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      // Get current user's class enrollments
      const { data: myEnrollments, error: enrollmentError } = await supabase
        .from('user_class_enrollments')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (enrollmentError) {
        console.error('Error fetching user enrollments:', enrollmentError)
        return []
      }

      if (!myEnrollments?.length) {
        return []
      }

      const classIds = myEnrollments.map(e => e.class_id)

      // Find other users enrolled in the same classes
      const { data: classmates, error: classmatesError } = await supabase
        .from('user_class_enrollments')
        .select(`
          user_id,
          class_id,
          class:class_id(id, class_code, class_name),
          profiles:user_id(
            id,
            full_name,
            username,
            avatar_url,
            major,
            graduation_year,
            grade,
            interests,
            personality_tags,
            yearbook_quote,
            university_id
          )
        `)
        .in('class_id', classIds)
        .eq('is_active', true)
        .neq('user_id', user.id)

      if (classmatesError) {
        console.error('Error fetching classmates:', classmatesError)
        return []
      }

      // Group by user and count shared classes
      const userMap = {}
      classmates?.forEach(enrollment => {
        const uid = enrollment.user_id
        if (!enrollment.profiles) return // Skip if no profile

        if (!userMap[uid]) {
          userMap[uid] = {
            ...enrollment.profiles,
            sharedClasses: [],
            sharedClassCount: 0,
          }
        }
        if (enrollment.class) {
          userMap[uid].sharedClasses.push(enrollment.class)
          userMap[uid].sharedClassCount++
        }
      })

      // Sort by shared class count (most first)
      return Object.values(userMap).sort((a, b) => b.sharedClassCount - a.sharedClassCount)
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fallback hook to get profiles from the same university
 * Used when user has no class enrollments
 */
export function useUniversityProfiles() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['university-profiles', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      // Get current user's university
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', user.id)
        .single()

      if (profileError || !currentProfile?.university_id) {
        console.error('Error fetching user university:', profileError)
        return []
      }

      // Get other profiles from the same university
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          avatar_url,
          major,
          graduation_year,
          grade,
          interests,
          personality_tags,
          yearbook_quote,
          university_id
        `)
        .eq('university_id', currentProfile.university_id)
        .neq('id', user.id)
        .limit(100)

      if (profilesError) {
        console.error('Error fetching university profiles:', profilesError)
        return []
      }

      return profiles || []
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to get shared classes between current user and another user
 */
export function useSharedClasses(otherUserId) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['shared-classes', user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId) return []

      const { data, error } = await supabase
        .from('user_class_enrollments')
        .select(`
          user_id,
          class_id,
          class:class_id(
            class_code,
            class_name
          )
        `)
        .in('user_id', [user.id, otherUserId])
        .eq('is_active', true)

      if (error) throw error

      const classesByUser = new Map()
      data.forEach((row) => {
        if (!classesByUser.has(row.user_id)) {
          classesByUser.set(row.user_id, new Set())
        }
        if (row.class_id) {
          classesByUser.get(row.user_id).add(row.class_id)
        }
      })

      const myClasses = classesByUser.get(user.id) || new Set()
      const otherClasses = classesByUser.get(otherUserId) || new Set()

      const sharedIds = new Set()
      myClasses.forEach((id) => {
        if (otherClasses.has(id)) sharedIds.add(id)
      })

      const shared = (data || [])
        .filter((row) => sharedIds.has(row.class_id))
        .map((row) => ({
          id: row.class_id,
          code: row.class?.class_code || null,
          name: row.class?.class_name || null,
        }))

      const deduped = new Map()
      shared.forEach((item) => {
        if (!deduped.has(item.id)) deduped.set(item.id, item)
      })

      return Array.from(deduped.values())
    },
    enabled: !!user?.id && !!otherUserId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}
