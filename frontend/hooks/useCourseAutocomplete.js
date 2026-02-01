/**
 * Hook for course code autocomplete
 * Searches existing courses in the database for suggestions
 * Helps users correct OCR mistakes by suggesting valid course codes
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Search for courses matching a search term
 * @param {string} searchTerm - The course code to search for (e.g., "CSC", "CSC 3")
 * @param {string} universityId - The university ID to filter by
 * @returns {object} Query result with matching courses
 */
export function useCourseAutocomplete(searchTerm, universityId) {
  return useQuery({
    queryKey: ['courses', 'autocomplete', searchTerm, universityId],
    queryFn: async () => {
      if (!universityId) {
        return []
      }

      // Normalize search term - remove spaces for partial matching
      const normalizedTerm = searchTerm?.replace(/\s+/g, '').toUpperCase() || ''

      // Search for courses matching the term
      const { data, error } = await supabase
        .from('courses')
        .select('id, course_code')
        .eq('school_id', universityId)
        .ilike('course_code', `%${searchTerm}%`)
        .order('course_code')
        .limit(10)

      if (error) {
        console.error('Error fetching course suggestions:', error)
        return []
      }

      return data || []
    },
    enabled: (searchTerm?.length || 0) >= 2 && !!universityId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  })
}

/**
 * Get all courses for a university (useful for validation)
 * @param {string} universityId - The university ID
 * @returns {object} Query result with all courses
 */
export function useUniversityCourses(universityId) {
  return useQuery({
    queryKey: ['courses', 'all', universityId],
    queryFn: async () => {
      if (!universityId) {
        return []
      }

      const { data, error } = await supabase
        .from('courses')
        .select('id, course_code')
        .eq('school_id', universityId)
        .order('course_code')

      if (error) {
        console.error('Error fetching university courses:', error)
        return []
      }

      return data || []
    },
    enabled: !!universityId,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  })
}

/**
 * Validate a course code against the database
 * Returns true if the course exists, false otherwise
 * @param {string} courseCode - The course code to validate
 * @param {string} universityId - The university ID
 * @returns {object} Query result with validation status
 */
export function useValidateCourseCode(courseCode, universityId) {
  return useQuery({
    queryKey: ['courses', 'validate', courseCode, universityId],
    queryFn: async () => {
      if (!universityId || !courseCode) {
        return { isValid: false, course: null }
      }

      // Normalize course code
      const normalizedCode = courseCode.trim().toUpperCase()

      // Try exact match first
      let { data, error } = await supabase
        .from('courses')
        .select('id, course_code')
        .eq('school_id', universityId)
        .eq('course_code', normalizedCode)
        .single()

      if (!error && data) {
        return { isValid: true, course: data }
      }

      // Try without spaces (e.g., "CSC305" matches "CSC 305")
      const codeWithoutSpaces = normalizedCode.replace(/\s+/g, '')
      const codeWithSpace = normalizedCode.replace(/([A-Z]+)(\d)/, '$1 $2')

      const { data: altData } = await supabase
        .from('courses')
        .select('id, course_code')
        .eq('school_id', universityId)
        .or(`course_code.eq.${codeWithoutSpaces},course_code.eq.${codeWithSpace}`)
        .limit(1)
        .single()

      if (altData) {
        return { isValid: true, course: altData }
      }

      return { isValid: false, course: null }
    },
    enabled: (courseCode?.length || 0) >= 3 && !!universityId,
    staleTime: 1000 * 60 * 5,
  })
}
