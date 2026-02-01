import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    Alert,
    Dimensions,
    Modal,
    PanResponder,
    Platform,
    StyleSheet,
    View,
} from 'react-native'
import { useAppTheme } from '../../app/theme'
import { useProfileModal } from '../../contexts/ProfileModalContext'
import { hp } from '../../helpers/common'
import { useProfile } from '../../hooks/useProfiles'
import ProfileModalContent from './ProfileModalContent'

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')
const DISMISS_THRESHOLD = 150

/**
 * Global Profile Modal with swipe-to-dismiss functionality
 * Listens to activeProfileId from ProfileModalContext
 */
const ProfileModal = () => {
    const { activeProfileId, profileStack, closeProfile, closeAllProfiles } = useProfileModal()
    const theme = useAppTheme()
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current
    const [isVisible, setIsVisible] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [isReady, setIsReady] = useState(false) // Delay content rendering
    const scrollYRef = useRef(0)
    const allowBackdropCloseRef = useRef(false)
    const prevProfileIdRef = useRef(null)

    // Fetch profile data when an ID is set
    const { data: profile, isLoading, refetch } = useProfile(activeProfileId)
    const [hasShownError, setHasShownError] = useState(false)
    
    // Track if profile changed (for nested profiles)
    const profileChanged = prevProfileIdRef.current !== activeProfileId && prevProfileIdRef.current !== null && activeProfileId !== null
    
    useEffect(() => {
        prevProfileIdRef.current = activeProfileId
    }, [activeProfileId])

    const handleClose = useCallback(() => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setIsVisible(false)
            setIsReady(false) // Reset ready state
            closeProfile()
        })
    }, [closeProfile, translateY])

    useEffect(() => {
        if (activeProfileId) {
            // Reset scroll position when profile changes
            scrollYRef.current = 0
            setHasShownError(false)
            setIsReady(false) // Reset ready state
            
            if (!isVisible) {
                // Opening fresh - animate in from bottom
                setIsVisible(true)
                allowBackdropCloseRef.current = false
                translateY.setValue(SCREEN_HEIGHT)
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }).start()
                const timer = setTimeout(() => {
                    allowBackdropCloseRef.current = true
                }, 250)
                
                // Delay content rendering to allow modal animation to complete
                const readyTimer = setTimeout(() => {
                    setIsReady(true)
                }, 100)
                
                return () => {
                    clearTimeout(timer)
                    clearTimeout(readyTimer)
                }
            } else {
                // Already visible, just update - small delay for stability
                setTimeout(() => setIsReady(true), 50)
            }
            // If already visible and profile changed (nested profile), just let it update
            // The content will re-render with the new profile data
        } else if (isVisible) {
            handleClose()
        }
    }, [activeProfileId, handleClose, isVisible, translateY])

    useEffect(() => {
        if (!activeProfileId) {
            setHasShownError(false)
            return
        }
        if (isLoading || profile || hasShownError) return
        setHasShownError(true)
        Alert.alert('Profile Unavailable', 'Unable to load this profile right now.')
        handleClose()
    }, [activeProfileId, hasShownError, handleClose, isLoading, profile])

    const panResponder = useMemo(() =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                const isAtTop = scrollYRef.current <= 5
                if (!isAtTop) return false

                const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2
                const isSwipingDown = gestureState.dy > 15
                return isVertical && isSwipingDown
            },
            onPanResponderGrant: () => {
                setIsDragging(true)
                translateY.stopAnimation()
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy)
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                setIsDragging(false)
                if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.5) {
                    handleClose()
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 11,
                    }).start()
                }
            },
            onPanResponderTerminate: () => {
                setIsDragging(false)
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }).start()
            },
        }), [handleClose, translateY])

    if (!isVisible) return null

    const backdropOpacity = translateY.interpolate({
        inputRange: [0, SCREEN_HEIGHT / 2],
        outputRange: [0.5, 0],
        extrapolate: 'clamp',
    })

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
            presentationStyle="overFullScreen"
        >
            <View style={{ flex: 1, backgroundColor: 'transparent', zIndex: 9999 }}>
                <Animated.View
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        opacity: backdropOpacity,
                        zIndex: 9999,
                    }}
                >
                    <View
                        style={{ flex: 1 }}
                        onTouchStart={() => {
                            if (allowBackdropCloseRef.current) {
                                handleClose()
                            }
                        }}
                    />
                </Animated.View>

                <Animated.View
                    style={{
                        position: 'absolute',
                        top: Platform.OS === 'ios' ? hp(5) : hp(2),
                        left: 0,
                        right: 0,
                        bottom: 0,
                        transform: [
                            { translateY },
                        ],
                        backgroundColor: 'transparent',
                        zIndex: 10000,
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            backgroundColor: theme.colors.background,
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            overflow: 'hidden',
                        }}
                    >
                        {(isLoading || !isReady) ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={theme.colors.bondedPurple} />
                            </View>
                        ) : profile ? (
                            <ProfileModalContent
                                activeProfile={{
                                    ...profile,
                                    name: profile.full_name || 'User',
                                    photoUrl: profile.avatar_url,
                                    quote: profile.yearbook_quote,
                                }}
                                onClose={handleClose}
                                scrollYRef={scrollYRef}
                                panResponder={panResponder}
                                isDragging={isDragging}
                            />
                        ) : null}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    )
}

export default ProfileModal
