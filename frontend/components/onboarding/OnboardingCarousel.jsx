import React, { useRef, useState } from 'react'
import {
    Animated,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { ONBOARDING_THEME } from '../../constants/onboardingTheme'
import { hp, wp } from '../../helpers/common'
import Button from '../Button'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const carouselData = [
  {
    id: '1',
    emoji: '✨',
    title: 'Discover Your People',
    description: 'Find classmates, study partners, and friends who share your interests and vibe.',
  },
  {
    id: '2',
    emoji: '👥',
    title: 'Connect on Campus',
    description: 'See who\'s in your classes, join campus discussions, and discover events happening around you.',
  },
  {
    id: '3',
    emoji: '🎯',
    title: 'Find Perfect Matches',
    description: 'Our AI-powered matching helps you connect with people who complement your personality and goals.',
  },
]

const OnboardingCarousel = ({ onContinue }) => {
  const styles = createStyles(ONBOARDING_THEME)
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef(null)
  const scrollX = useRef(new Animated.Value(0)).current

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  )

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index)
    }
  }).current

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current

  const handleNext = () => {
    if (currentIndex < carouselData.length - 1) {
      flatListRef.current?.scrollToIndex({ 
        index: currentIndex + 1,
        animated: true,
      })
    } else {
      onContinue()
    }
  }

  const handleSkip = () => {
    onContinue()
  }

  const renderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ]

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.85, 1, 0.85],
      extrapolate: 'clamp',
    })

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
      extrapolate: 'clamp',
    })

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [30, 0, 30],
      extrapolate: 'clamp',
    })

    const emojiScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1.1, 0.9],
      extrapolate: 'clamp',
    })

    return (
      <View style={styles.slide}>
        <Animated.View
          style={[
            styles.slideContent,
            {
              transform: [{ scale }, { translateY }],
              opacity,
            },
          ]}
        >
          {/* Emoji/Icon */}
          <Animated.View
            style={[
              styles.emojiContainer,
              {
                transform: [{ scale: emojiScale }],
              },
            ]}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{item.description}</Text>
        </Animated.View>
      </View>
    )
  }

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {carouselData.map((_, index) => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ]

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          })

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          })

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                },
              ]}
            />
          )
        })}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={carouselData}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Pagination Dots */}
      {renderPagination()}

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title={currentIndex === carouselData.length - 1 ? "Let's Go!" : 'Next'}
          onPress={handleNext}
          buttonStyle={styles.button}
          theme={ONBOARDING_THEME}
        />
      </View>
    </View>
  )
}

export default OnboardingCarousel

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  skipButton: {
    position: 'absolute',
    top: hp(6),
    right: wp(6),
    zIndex: 10,
    padding: wp(2),
  },
  skipText: {
    fontSize: hp(2),
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.body,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  slideContent: {
    alignItems: 'center',
    width: '100%',
  },
  emojiContainer: {
    marginBottom: hp(4),
    width: hp(12),
    height: hp(12),
    borderRadius: hp(6),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  emoji: {
    fontSize: hp(6),
  },
  title: {
    fontSize: hp(4.5),
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: hp(3),
    fontFamily: theme.typography.fontFamily.heading,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: hp(2.2),
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp(3.2),
    fontFamily: theme.typography.fontFamily.body,
    paddingHorizontal: wp(4),
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: wp(2),
    marginTop: hp(4),
    marginBottom: hp(2),
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  buttonContainer: {
    paddingHorizontal: wp(6),
    paddingBottom: hp(6),
  },
  button: {
    width: '100%',
  },
})












