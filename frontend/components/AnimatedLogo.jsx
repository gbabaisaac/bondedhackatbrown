import { Animated, StyleSheet } from 'react-native'
import React, { useEffect, useRef } from 'react'
import { wp } from '../helpers/common'

const AnimatedLogo = ({
    size = 60,
    source = require('../assets/images/transparent-bonded.png'),
    duration = 4000,
    style,
}) => {
    const spinValue = useRef(new Animated.Value(0)).current

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

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    })

    return (
        <Animated.Image
            source={source}
            style={[
                {
                    width: wp(size),
                    height: wp(size),
                    resizeMode: 'contain',
                },
                style,
                { transform: [{ rotate: spin }] },
            ]}
        />
    )
}

export default AnimatedLogo

