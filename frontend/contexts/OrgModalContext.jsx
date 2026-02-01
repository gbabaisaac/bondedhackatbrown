import { createContext, useCallback, useContext, useState } from 'react'

const OrgModalContext = createContext()

/**
 * Global provider for the unified org modal
 * Allows triggering the org modal from anywhere in the app
 */
export const OrgModalProvider = ({ children }) => {
    const [activeOrgId, setActiveOrgId] = useState(null)

    const openOrg = useCallback((orgId) => {
        setActiveOrgId(orgId)
    }, [])

    const closeOrg = useCallback(() => {
        setActiveOrgId(null)
    }, [])

    return (
        <OrgModalContext.Provider
            value={{
                activeOrgId,
                openOrg,
                closeOrg
            }}
        >
            {children}
        </OrgModalContext.Provider>
    )
}

export const useOrgModal = () => {
    const context = useContext(OrgModalContext)
    if (!context) {
        throw new Error('useOrgModal must be used within an OrgModalProvider')
    }
    return context
}
