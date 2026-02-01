import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAppTheme } from '../../app/theme'
import { useProfileModal } from '../../contexts/ProfileModalContext'
import { hp, wp } from '../../helpers/common'

export default function ChatHeader({
    userName,
    userAvatar,
    userId,
    isGroup,
    conversationType,
    groupMembersCount,
    onPressProfile,
    participants = [],
    onShowMembers
}) {
    const router = useRouter()
    const theme = useAppTheme()
    const styles = createStyles(theme)
    const { openProfile } = useProfileModal()

    const handleProfilePress = () => {
        if (onPressProfile) {
            onPressProfile()
        } else if (isGroup && onShowMembers) {
            onShowMembers()
        } else if (userId && !isGroup) {
            openProfile(userId)
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={hp(3)} color={theme.colors.bondedPurple} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.profileContainer}
                    activeOpacity={0.7}
                    onPress={handleProfilePress}
                >
                    <View style={styles.avatarContainer}>
                        {userAvatar ? (
                            <Image
                                source={{ uri: userAvatar }}
                                style={styles.avatar}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                {isGroup ? (
                                    <Ionicons
                                        name={conversationType === 'org' ? 'business' : conversationType === 'class' ? 'school' : 'people'}
                                        size={hp(2.2)}
                                        color={theme.colors.textSecondary}
                                    />
                                ) : (
                                    <Text style={styles.avatarText}>
                                        {(userName || '?').charAt(0).toUpperCase()}
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.name} numberOfLines={1}>
                            {userName || 'Chat'}
                        </Text>
                        {isGroup && groupMembersCount > 0 && (
                            <Text style={styles.subtitle}>
                                {groupMembersCount} members
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>

                {/* Right side spacer or action button could go here */}
                <View style={styles.rightPlaceholder} />
            </View>
        </View>
    )
}

const createStyles = (theme) => StyleSheet.create({
    container: {
        backgroundColor: theme.colors.background, // iOS clean white/dark
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border || 'rgba(0,0,0,0.1)',
        paddingTop: hp(1),
        paddingBottom: hp(1.5),
        paddingHorizontal: wp(2),
        zIndex: 10,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        paddingRight: wp(2),
        paddingLeft: wp(1),
    },
    profileContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Center title like iOS
        marginRight: wp(4), // Balance the back button space
    },
    avatarContainer: {
        marginRight: wp(2),
    },
    avatar: {
        width: hp(4),
        height: hp(4),
        borderRadius: hp(2), // Circle
    },
    avatarPlaceholder: {
        backgroundColor: theme.colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: hp(1.8),
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    textContainer: {
        alignItems: 'center',
    },
    name: {
        fontSize: hp(2),
        fontWeight: '700', // Bold header
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.heading,
    },
    subtitle: {
        fontSize: hp(1.4),
        color: theme.colors.textSecondary,
        marginTop: -2,
    },
    rightPlaceholder: {
        width: hp(3), // Approximate width of back button to keep center alignment
    }
})
