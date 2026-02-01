import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { hp, wp } from '../../helpers/common'

export default function ChatInput({
    theme,
    inputText,
    setInputText,
    handleTextChange,
    selectedImage,
    removeSelectedImage,
    pickImage,
    isSending,
    uploadingImage,
    handleSend,
    sendImage,
}) {
    const styles = createStyles(theme)

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? hp(2) : 0}
        >
            {/* Image Preview (inside input area, Instagram-style) */}
            {selectedImage && (
                <View style={styles.inlineImagePreview}>
                    <Image source={{ uri: selectedImage }} style={styles.inlineImagePreviewImage} />
                    <TouchableOpacity
                        style={styles.inlineRemoveImageButton}
                        onPress={removeSelectedImage}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close-circle" size={hp(2.5)} color={theme.colors.error || '#FF3B30'} />
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.floatingInputContainer}>
                <TouchableOpacity
                    style={styles.floatingAttachButton}
                    activeOpacity={0.7}
                    onPress={pickImage}
                >
                    <Ionicons name="add" size={hp(3)} color={theme.colors.bondedPurple} />
                </TouchableOpacity>

                <TextInput
                    style={styles.floatingInput}
                    placeholder={selectedImage ? "Add a caption..." : "Message"}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={inputText}
                    onChangeText={handleTextChange}
                    multiline
                    maxLength={500}
                />

                {(isSending || uploadingImage) ? (
                    <View style={styles.floatingSendButton}>
                        <ActivityIndicator size="small" color="#FFF" />
                    </View>
                ) : (
                    (inputText.trim() || selectedImage) && (
                        <TouchableOpacity
                            style={styles.floatingSendButton}
                            activeOpacity={0.7}
                            onPress={selectedImage ? sendImage : handleSend}
                        >
                            <Ionicons name="arrow-up" size={hp(2.5)} color="#FFF" />
                        </TouchableOpacity>
                    )
                )}
            </View>
        </KeyboardAvoidingView>
    )
}

const createStyles = (theme) => StyleSheet.create({
    inlineImagePreview: {
        padding: wp(2),
        backgroundColor: theme.colors.background,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border || 'rgba(0,0,0,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    inlineImagePreviewImage: {
        width: hp(8),
        height: hp(8),
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.backgroundSecondary,
    },
    inlineRemoveImageButton: {
        position: 'absolute',
        top: -hp(0.5),
        right: wp(1),
        backgroundColor: 'white',
        borderRadius: hp(1.25),
    },
    floatingInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: wp(3),
        paddingVertical: hp(1),
        backgroundColor: theme.colors.background,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border || 'rgba(0,0,0,0.1)',
        paddingBottom: Platform.OS === 'ios' ? hp(2) : hp(1),
    },
    floatingAttachButton: {
        padding: hp(0.8),
        marginBottom: hp(0.2),
    },
    floatingInput: {
        flex: 1,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.radius.xl,
        paddingHorizontal: wp(4),
        paddingVertical: hp(1),
        paddingTop: hp(1),
        marginHorizontal: wp(2),
        fontSize: hp(1.8),
        color: theme.colors.textPrimary,
        maxHeight: hp(12),
        fontFamily: theme.typography.fontFamily.body,
    },
    floatingSendButton: {
        width: hp(4.5),
        height: hp(4.5),
        borderRadius: hp(2.25),
        backgroundColor: theme.colors.bondedPurple,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: hp(0.2),
    },
})
