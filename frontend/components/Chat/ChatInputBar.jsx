import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { useAppTheme } from '../../app/theme'
import { hp, wp } from '../../helpers/common'

export default function ChatInputBar({ onSend, isSending, placeholder = "iMessage" }) {
    const theme = useAppTheme()
    const styles = createStyles(theme)
    const [text, setText] = useState('')

    const handleSend = () => {
        if (!text.trim() || isSending) return
        onSend(text.trim())
        setText('')
    }

    return (
        <View style={styles.container}>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxLength={1000}
                    returnKeyType="default"
                />

                {/* Optional: Add attachment button inside pill or outside */}
            </View>

            <TouchableOpacity
                style={[
                    styles.sendButton,
                    (!text.trim() || isSending) && styles.sendButtonDisabled
                ]}
                onPress={handleSend}
                disabled={!text.trim() || isSending}
            >
                {isSending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <Ionicons name="arrow-up" size={hp(2.4)} color="#FFF" />
                )}
            </TouchableOpacity>
        </View>
    )
}

const createStyles = (theme) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.5),
        backgroundColor: theme.colors.background,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border || 'rgba(0,0,0,0.1)',
    },
    inputWrapper: {
        flex: 1,
        minHeight: hp(4.5),
        maxHeight: hp(12),
        backgroundColor: theme.colors.backgroundSecondary || '#F2F2F7', // iMessage gray
        borderRadius: 20, // Pill shape
        paddingHorizontal: wp(3),
        paddingTop: hp(1), // Visual center text vertically
        paddingBottom: hp(1),
        marginRight: wp(2),
        borderWidth: 1,
        borderColor: theme.colors.border || 'transparent',
    },
    input: {
        fontSize: hp(1.9),
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.body,
        padding: 0, // Remove default Android padding
    },
    sendButton: {
        width: hp(4),
        height: hp(4),
        borderRadius: hp(2), // Circle
        backgroundColor: theme.colors.bondedPurple,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: hp(0.2), // Align with input bottom
    },
    sendButtonDisabled: {
        backgroundColor: theme.colors.textSecondary + '50', // Faded opacity
    }
})
