import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef } from 'react'
import { Animated, Image, StyleSheet, Text, View } from 'react-native'
import { hp, wp } from '../../helpers/common'

export default function TypingIndicator({ theme, isOtherTyping, typingUserName, typingUserAvatar }) {
    const dot1Anim = useRef(new Animated.Value(0.4)).current
    const dot2Anim = useRef(new Animated.Value(0.4)).current
    const dot3Anim = useRef(new Animated.Value(0.4)).current

    useEffect(() => {
        if (!isOtherTyping) return

        const animate = (anim, delay) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 400,
                        delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0.4,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            )
        }

        const anims = [
            animate(dot1Anim, 0),
            animate(dot2Anim, 200),
            animate(dot3Anim, 400),
        ]

        anims.forEach(anim => anim.start())

        return () => anims.forEach(anim => anim.stop())
    }, [isOtherTyping])

    if (!isOtherTyping) return null

    return (
        <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
                <View style={styles.typingHeader}>
                    {typingUserAvatar ? (
                        <Image source={{ uri: typingUserAvatar }} style={styles.typingAvatar} />
                    ) : (
                        <View style={styles.typingAvatarPlaceholder}>
                            <Ionicons name="person" size={hp(1.5)} color={theme.colors.textSecondary} />
                        </View>
                    )}
                    {typingUserName && (
                        <Text style={styles.typingUserName}>{typingUserName} is typing</Text>
                    )}
                </View>
                <View style={styles.typingDots}>
                    {[dot1Anim, dot2Anim, dot3Anim].map((anim, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.typingDot,
                                {
                                    backgroundColor: theme.colors.textSecondary,
                                    opacity: anim,
                                    transform: [{
                                        scale: anim.interpolate({
                                            inputRange: [0.4, 1],
                                            outputRange: [1, 1.2],
                                        })
                                    }]
                                }
                            ]}
                        />
                    ))}
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    typingContainer: {
        paddingHorizontal: wp(4),
        paddingVertical: hp(1),
        alignItems: 'flex-start',
    },
    typingBubble: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.8),
        borderRadius: hp(2),
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: wp(60),
    },
    typingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: wp(2),
    },
    typingAvatar: {
        width: hp(2.5),
        height: hp(2.5),
        borderRadius: hp(1.25),
        marginRight: wp(1.5),
    },
    typingAvatarPlaceholder: {
        width: hp(2.5),
        height: hp(2.5),
        borderRadius: hp(1.25),
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: wp(1.5),
    },
    typingUserName: {
        fontSize: hp(1.4),
        color: 'rgba(0,0,0,0.6)',
        fontWeight: '500',
    },
    typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typingDot: {
        width: hp(0.6),
        height: hp(0.6),
        borderRadius: hp(0.3),
        marginHorizontal: wp(0.5),
    },
})
