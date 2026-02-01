import { UseQueryResult } from '@tanstack/react-query'

export interface UserProfile {
  id: string
  username: string
  full_name: string
  avatar_url?: string
  university_id: string
  onboarding_complete: boolean
  profile_completion_percentage: number
  // Add other profile fields as needed
}

export function useCurrentUserProfile(): UseQueryResult<UserProfile | null, unknown>
