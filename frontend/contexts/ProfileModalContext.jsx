import { createContext, useCallback, useContext, useState } from 'react'

const ProfileModalContext = createContext()

/**
 * Global provider for the unified profile modal
 * Allows triggering the profile modal from anywhere in the app
 * Supports stacked profiles (clicking friend in profile opens their profile on top)
 */
export const ProfileModalProvider = ({ children }) => {
    const [profileStack, setProfileStack] = useState([])

    // Get the currently active profile (top of stack)
    const activeProfileId = profileStack.length > 0 ? profileStack[profileStack.length - 1] : null

    const openProfile = useCallback((profileId) => {
        if (!profileId) return
        setProfileStack(prev => {
            // If this profile is already at the top, don't add again
            if (prev.length > 0 && prev[prev.length - 1] === profileId) {
                return prev
            }
            // Add to stack (allows nested profile viewing)
            return [...prev, profileId]
        })
    }, [])

    const closeProfile = useCallback(() => {
        setProfileStack(prev => {
            if (prev.length <= 1) {
                // Close completely if only one or no profiles
                return []
            }
            // Pop the top profile, show the previous one
            return prev.slice(0, -1)
        })
    }, [])

    // Close all profiles at once
    const closeAllProfiles = useCallback(() => {
        setProfileStack([])
    }, [])

    return (
        <ProfileModalContext.Provider
            value={{
                activeProfileId,
                profileStack,
                openProfile,
                closeProfile,
                closeAllProfiles,
            }}
        >
            {children}
        </ProfileModalContext.Provider>
    )
}

export const useProfileModal = () => {
    const context = useContext(ProfileModalContext)
    if (!context) {
        throw new Error('useProfileModal must be used within a ProfileModalProvider')
    }
    return context
}
