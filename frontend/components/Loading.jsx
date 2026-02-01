import { Animated, StyleSheet, View, Text, ImageBackground } from 'react-native'
import React, { useEffect, useRef } from 'react'
import { wp, hp } from '../helpers/common'
import { useAppTheme } from '../app/theme'

const Loading = ({
    size = 60,
    source = require('../assets/images/transparent-bonded.png'),
    duration = 1200, // Faster spin - default 1200ms
    style,
    fadeOut = false,
    onFadeComplete,
}) => {
    const theme = useAppTheme()
    const styles = createStyles(theme)
    const spinValue = useRef(new Animated.Value(0)).current
    const fadeValue = useRef(new Animated.Value(1)).current

    useEffect(() => {
        const spinAnimation = Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration,
                useNativeDriver: true,
            })
        )

        spinAnimation.start()
        return () => {
            spinAnimation.stop()
            spinValue.setValue(0)
        }
    }, [spinValue, duration])

    useEffect(() => {
        if (fadeOut) {
            Animated.timing(fadeValue, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start(() => {
                if (onFadeComplete) {
                    onFadeComplete()
                }
            })
        }
    }, [fadeOut, fadeValue, onFadeComplete])

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    })

    return (
        <Animated.View 
            style={[
                styles.container, 
                style,
                { opacity: fadeValue }
            ]}
        >
            <ImageBackground
                source={require('../assets/images/bonded-gradient.jpg')}
                style={styles.background}
                resizeMode="cover"
            >
                <View style={styles.content}>
                    <Animated.Image
                        source={source}
                        style={[
                            {
                                width: wp(size),
                                height: wp(size),
                                resizeMode: 'contain',
                            },
                            { transform: [{ rotate: spin }] },
                        ]}
                    />
                    <Text style={styles.text}></Text>
                </View>
            </ImageBackground>
        </Animated.View>
    )
}

export default Loading

const createStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: hp(3),
    },
    text: {
        fontSize: hp(3.5),
        fontFamily: theme.typography.fontFamily.heading,
        fontWeight: '700',
        color: theme.colors.white,
        letterSpacing: wp(0.5),
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
})

