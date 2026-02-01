import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    Platform,
    StyleSheet,
    View,
} from 'react-native'
import { useAppTheme } from '../../app/theme'
import { useClubsContext } from '../../contexts/ClubsContext'
import { useOrgModal } from '../../contexts/OrgModalContext'
import { hp } from '../../helpers/common'
import OrgModalContent from './OrgModalContent'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const DISMISS_THRESHOLD = 150

/**
 * Global Org Modal with swipe-to-dismiss functionality
 * Listens to activeOrgId from OrgModalContext
 */
const OrgModal = () => {
    const { activeOrgId, closeOrg } = useOrgModal()
    const theme = useAppTheme()
    const { getClub } = useClubsContext()
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current
    const [isVisible, setIsVisible] = useState(false)
    const scrollYRef = useRef(0)

    // Get org data from ClubsContext - memoize to prevent unnecessary re-renders
    const org = useMemo(() => {
        return activeOrgId ? getClub(activeOrgId) : null
    }, [activeOrgId, getClub])
    const isLoading = !org && !!activeOrgId

    useEffect(() => {
        if (activeOrgId) {
            setIsVisible(true)
            translateY.setValue(SCREEN_HEIGHT)
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start()
        } else if (isVisible) {
            handleClose()
        }
    }, [activeOrgId])

    const handleClose = useCallback(() => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setIsVisible(false)
            closeOrg()
        })
    }, [closeOrg, translateY])

    const panResponder = useMemo(() =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                const isAtTop = scrollYRef.current <= 5
                if (!isAtTop) return false

                // Check for vertical swipe down
                const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2
                const isSwipingDown = gestureState.dy > 15
                return isVertical && isSwipingDown
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy)
                }
            },
            onPanResponderRelease: (_, gestureState) => {
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

    const modalScale = translateY.interpolate({
        inputRange: [0, SCREEN_HEIGHT],
        outputRange: [1, 0.9],
        extrapolate: 'clamp',
    })

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="none"
            statusBarTranslucent
            presentationStyle="overFullScreen"
            hardwareAccelerated
            onRequestClose={handleClose}
        >
            <View style={{ flex: 1, backgroundColor: 'transparent', zIndex: 100 }}>
                <Animated.View
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: '#000',
                        opacity: backdropOpacity,
                    }}
                >
                    <View style={{ flex: 1 }} onTouchStart={handleClose} />
                </Animated.View>

                <Animated.View
                    style={{
                        position: 'absolute',
                        top: Platform.OS === 'ios' ? hp(8) : hp(6),
                        left: 0,
                        right: 0,
                        bottom: 0,
                        transform: [
                            { translateY },
                            { scale: modalScale },
                        ],
                        backgroundColor: theme.colors.background,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        overflow: 'hidden',
                    }}
                >
                    {isLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={theme.colors.bondedPurple} />
                        </View>
                    ) : org ? (
                        <OrgModalContent
                            org={org}
                            onClose={handleClose}
                            scrollYRef={scrollYRef}
                            panResponder={panResponder}
                        />
                    ) : null}
                </Animated.View>
            </View>
        </Modal>
    )
}

export default OrgModal
