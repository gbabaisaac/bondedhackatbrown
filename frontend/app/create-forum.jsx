import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppTheme } from './theme'
import { hp, wp } from '../helpers/common'
import AppTopBar from '../components/AppTopBar'

export default function CreateForum() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [allowNonAnon, setAllowNonAnon] = useState(true)

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <AppTopBar
          schoolName="University of Rhode Island"
          onPressProfile={() => router.push('/profile')}
          onPressSchool={() => {}}
          onPressNotifications={() => router.push('/notifications')}
        />

        <Text style={styles.title}>Create forum</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Forum name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Campus Events, CS memes..."
            placeholderTextColor={theme.colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What is this forum for?"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Private forum</Text>
            <Text style={styles.hint}>
              Only invited members can see and post.
            </Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.bondedPurple,
            }}
            thumbColor={theme.colors.white}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Stories (Coming soon)</Text>
            <Text style={styles.hint}>Stories will be available in V2.</Text>
          </View>
          <Switch
            value={false}
            onValueChange={() => {}}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.bondedPurple,
            }}
            thumbColor={theme.colors.white}
            disabled
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Allow non-anonymous posts</Text>
            <Text style={styles.hint}>
              If off, all posts will be anonymous (like RMP).
            </Text>
          </View>
          <Switch
            value={allowNonAnon}
            onValueChange={setAllowNonAnon}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.bondedPurple,
            }}
            thumbColor={theme.colors.white}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            activeOpacity={0.8}
            onPress={() => {
              // In the future this will call Supabase.
              router.push('/forum')
            }}
          >
            <Ionicons
              name="add-circle-outline"
              size={hp(2.1)}
              color={theme.colors.white}
              style={{ marginRight: wp(1.5) }}
            />
            <Text style={styles.primaryText}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
  },
  title: {
    marginTop: hp(1.5),
    marginBottom: hp(1.5),
    fontSize: hp(2.4),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
  },
  inputGroup: {
    marginBottom: hp(1.8),
  },
  label: {
    fontSize: hp(1.8),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.5),
  },
  hint: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    opacity: 0.8,
    fontFamily: theme.typography.fontFamily.body,
  },
  input: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    fontSize: hp(1.8),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  textArea: {
    minHeight: hp(10),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(3),
    marginTop: hp(3),
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.3),
    borderRadius: theme.radius.lg,
  },
  secondaryButton: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  primaryButton: {
    backgroundColor: theme.colors.bondedPurple,
  },
  secondaryText: {
    fontSize: hp(1.8),
    color: theme.colors.bondedPurple,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
  primaryText: {
    fontSize: hp(1.8),
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
  },
})


