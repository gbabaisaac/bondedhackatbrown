import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { hp, wp } from '../helpers/common'
import { useAppTheme } from '../app/theme'
import { useFriends } from '../hooks/useFriends'

export default function InviteModal({ visible, clubName, onClose, onInvite }) {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const insets = useSafeAreaInsets()
  const { data: friends = [], isLoading } = useFriends()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])

  const friendOptions = useMemo(() => (
    friends.map((friend) => ({
      id: friend.id,
      name: friend.full_name || friend.username || 'User',
      photoUrl: friend.avatar_url || null,
    }))
  ), [friends])

  const filteredUsers = useMemo(() => {
    if (!searchQuery) {
      return friendOptions
    }
    return friendOptions.filter((user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, friendOptions])

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleInvite = () => {
    if (selectedUsers.length === 0) {
      return
    }
    onInvite(selectedUsers)
    setSelectedUsers([])
    setSearchQuery('')
    onClose()
  }

  const renderUser = ({ item }) => {
    const isSelected = selectedUsers.includes(item.id)
    const initial = item.name?.charAt(0)?.toUpperCase() || 'U'
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => toggleUserSelection(item.id)}
        activeOpacity={0.7}
      >
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatarPlaceholder}>
            <Text style={styles.userAvatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={hp(2.5)} color={theme.colors.bondedPurple} />
        )}
      </TouchableOpacity>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(hp(1.5), insets.top * 0.6) }]}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={hp(3)} color={theme.colors.charcoal} />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Invite to {clubName}</Text>
                <Text style={styles.headerSubtitle}>
                  {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : 'Select people to invite'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleInvite}
                style={[styles.inviteButton, selectedUsers.length === 0 && styles.inviteButtonDisabled]}
                disabled={selectedUsers.length === 0}
              >
                <Text style={styles.inviteButtonText}>Invite</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={hp(2.2)} color={theme.colors.softBlack} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search people"
                placeholderTextColor={theme.colors.softBlack + '80'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <View style={styles.selectedUsersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedUsersScroll}>
                  {selectedUsers.map((userId) => {
                    const user = friendOptions.find((u) => u.id === userId)
                    if (!user) return null
                    return (
                      <TouchableOpacity
                        key={user.id}
                        style={styles.selectedUserPill}
                        onPress={() => toggleUserSelection(user.id)}
                      >
                        {user.photoUrl ? (
                          <Image source={{ uri: user.photoUrl }} style={styles.selectedUserAvatar} />
                        ) : (
                          <View style={styles.selectedUserAvatarFallback}>
                            <Text style={styles.selectedUserAvatarInitial}>
                              {(user.name?.charAt(0) || 'U').toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.selectedUserName}>{user.name}</Text>
                        <Ionicons name="close-circle" size={hp(1.8)} color={theme.colors.white} />
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
            )}

            {/* Users List */}
            {isLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Loading friends...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderUser}
                contentContainerStyle={styles.usersList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      {searchQuery ? 'No matches found' : 'No friends to invite yet'}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
    backgroundColor: theme.colors.background,
  },
  closeButton: {
    padding: wp(1.5),
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: hp(2.2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    opacity: 0.7,
    marginTop: hp(0.2),
  },
  inviteButton: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.bondedPurple,
  },
  inviteButtonDisabled: {
    opacity: 0.5,
  },
  inviteButtonText: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.offWhite,
  },
  searchInput: {
    flex: 1,
    marginLeft: wp(2),
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  selectedUsersContainer: {
    marginBottom: hp(1.5),
  },
  selectedUsersScroll: {
    paddingHorizontal: wp(4),
    gap: wp(2),
  },
  selectedUserPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.xl,
    paddingVertical: hp(0.8),
    paddingLeft: wp(2),
    paddingRight: wp(1.5),
    gap: wp(1.5),
  },
  selectedUserAvatar: {
    width: hp(2.5),
    height: hp(2.5),
    borderRadius: hp(1.25),
  },
  selectedUserAvatarFallback: {
    width: hp(2.5),
    height: hp(2.5),
    borderRadius: hp(1.25),
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedUserAvatarInitial: {
    fontSize: hp(1.2),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.bondedPurple,
  },
  selectedUserName: {
    fontSize: hp(1.4),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.white,
    fontWeight: '600',
  },
  usersList: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.offWhite,
    gap: wp(3),
  },
  userAvatar: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: theme.radius.full,
    marginRight: wp(3),
  },
  userAvatarPlaceholder: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: theme.radius.full,
    marginRight: wp(3),
    backgroundColor: theme.colors.bondedPurple + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitial: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: '700',
    color: theme.colors.bondedPurple,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: hp(1.8),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    marginBottom: hp(0.2),
  },
  emptyState: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(4),
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: hp(1.6),
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
})
