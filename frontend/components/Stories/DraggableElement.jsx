import React, { useRef, useState, useEffect } from 'react'
import { View, StyleSheet, PanResponder, Dimensions, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { hp, wp } from '../../helpers/common'
import { useAppTheme } from '../../app/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function DraggableElement({
  children,
  initialX,
  initialY,
  initialScale = 1,
  initialRotation = 0,
  minScale = 0.5,
  maxScale = 2,
  onUpdate,
  onDelete,
  isSelected = false,
}) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const [position, setPosition] = useState({ x: initialX, y: initialY })
  const [scale, setScale] = useState(initialScale)
  const [rotation, setRotation] = useState(initialRotation)
  const startPosition = useRef({ x: initialX, y: initialY })
  const startScale = useRef(initialScale)
  const startRotation = useRef(initialRotation)
  const gestureStart = useRef({ x: 0, y: 0, distance: 0, angle: 0 })
  const mode = useRef('drag') // 'drag', 'resize', 'rotate'

  useEffect(() => {
    setPosition({ x: initialX, y: initialY })
    setScale(initialScale)
    setRotation(initialRotation)
    startPosition.current = { x: initialX, y: initialY }
    startScale.current = initialScale
    startRotation.current = initialRotation
  }, [initialX, initialY, initialScale, initialRotation])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const { locationX, locationY } = evt.nativeEvent
        const elementWidth = 100
        const elementHeight = 50

        // Check resize handle (bottom right) - relative to element
        const resizeHandleSize = 30
        if (
          locationX > elementWidth - resizeHandleSize &&
          locationY > elementHeight - resizeHandleSize
        ) {
          mode.current = 'resize'
          gestureStart.current.distance = Math.sqrt(
            Math.pow(locationX - elementWidth / 2, 2) +
              Math.pow(locationY - elementHeight / 2, 2)
          )
          return true
        }

        // Check rotate handle (top center)
        if (
          locationX > elementWidth / 2 - 20 &&
          locationX < elementWidth / 2 + 20 &&
          locationY < 30
        ) {
          mode.current = 'rotate'
          gestureStart.current.angle = Math.atan2(
            locationY - elementHeight / 2,
            locationX - elementWidth / 2
          )
          return true
        }

        // Default to drag
        mode.current = 'drag'
        gestureStart.current.x = locationX
        gestureStart.current.y = locationY
        return true
      },
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        startPosition.current = { ...position }
        startScale.current = scale
        startRotation.current = rotation
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dx, dy, numberActiveTouches } = gestureState

        if (mode.current === 'resize') {
          // Resize based on distance from center
          const currentDistance = Math.sqrt(
            Math.pow(gestureStart.current.x + dx - 50, 2) +
              Math.pow(gestureStart.current.y + dy - 25, 2)
          )
          const scaleFactor = currentDistance / gestureStart.current.distance
          const newScale = Math.max(
            minScale,
            Math.min(maxScale, startScale.current * scaleFactor)
          )
          setScale(newScale)
        } else if (mode.current === 'rotate') {
          // Rotate based on angle
          const currentAngle = Math.atan2(
            gestureStart.current.y + dy - 25,
            gestureStart.current.x + dx - 50
          )
          const angleDiff = currentAngle - gestureStart.current.angle
          const newRotation = startRotation.current + (angleDiff * 180) / Math.PI
          setRotation(newRotation)
        } else {
          // Drag
          const newX = Math.max(
            0,
            Math.min(SCREEN_WIDTH - 100, startPosition.current.x + dx)
          )
          const newY = Math.max(
            0,
            Math.min(SCREEN_HEIGHT - 100, startPosition.current.y + dy)
          )
          setPosition({ x: newX, y: newY })
        }
      },
      onPanResponderRelease: () => {
        if (onUpdate) {
          onUpdate({
            x: position.x,
            y: position.y,
            scale,
            rotation,
          })
        }
        mode.current = 'drag'
      },
    })
  ).current

  return (
    <View
      style={[
        styles.container,
        {
          left: position.x,
          top: position.y,
          transform: [{ scale }, { rotate: `${rotation}deg` }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {children}
      {isSelected && (
        <>
          {/* Resize handle */}
          <View style={styles.resizeHandle}>
            <View style={styles.handleDot} />
          </View>
          {/* Rotate handle */}
          <View style={styles.rotateHandle}>
            <View style={styles.handleDot} />
          </View>
          {/* Delete button */}
          <TouchableOpacity style={styles.deleteHandle} onPress={onDelete}>
            <Ionicons name="close-circle" size={hp(2.5)} color={theme.colors.error} />
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resizeHandle: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotateHandle: {
    position: 'absolute',
    top: -25,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.bondedPurple,
    borderWidth: 3,
    borderColor: theme.colors.white,
  },
  deleteHandle: {
    position: 'absolute',
    top: -12,
    left: -12,
  },
})
