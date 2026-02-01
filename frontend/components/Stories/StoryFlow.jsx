import React, { useState } from 'react'
import StoryCreator from './StoryCreator'
import StoryEditor from './StoryEditor'
import StoryPreview from './StoryPreview'
import { useStoriesContext } from '../../contexts/StoriesContext'

export default function StoryFlow({
  visible,
  forumId,
  forumName,
  userId,
  userName,
  userAvatar,
  onClose,
}) {
  const [step, setStep] = useState('creator') // 'creator', 'editor', 'preview'
  const [capturedMedia, setCapturedMedia] = useState(null)
  const [editedContent, setEditedContent] = useState(null)
  const { addStoryToForum } = useStoriesContext()

  const handleCaptured = (media) => {
    setCapturedMedia(media)
    // Skip editor for videos, go straight to preview
    if (media.type === 'video') {
      setEditedContent({
        imageUri: media.uri,
        type: 'video',
        textElements: [],
        stickerElements: [],
      })
      setStep('preview')
    } else {
      setStep('editor')
    }
  }

  const handleEdited = (content) => {
    setEditedContent(content)
    setStep('preview')
  }

  const handlePost = async () => {
    try {
      const story = {
        userId,
        userName,
        userAvatar,
        forumId,
        imageUri: editedContent.imageUri,
        type: editedContent.type || 'image',
        textElements: editedContent.textElements || [],
        stickerElements: editedContent.stickerElements || [],
        timeAgo: 'now',
      }

      addStoryToForum(forumId, story)

      // Reset state
      setStep('creator')
      setCapturedMedia(null)
      setEditedContent(null)
      onClose()
    } catch (error) {
      console.log('Post story error:', error)
    }
  }

  const handleBackFromEditor = () => {
    setStep('creator')
    setCapturedMedia(null)
  }

  const handleBackFromPreview = () => {
    setStep('editor')
  }

  if (!visible) return null

  return (
    <>
      {step === 'creator' && (
        <StoryCreator
          visible={visible}
          forumId={forumId}
          forumName={forumName}
          onClose={onClose}
          onCaptured={handleCaptured}
        />
      )}

      {step === 'editor' && capturedMedia && (
        <StoryEditor
          visible={true}
          imageUri={capturedMedia.uri}
          forumId={forumId}
          forumName={forumName}
          onClose={handleBackFromEditor}
          onPost={handleEdited}
        />
      )}

      {step === 'preview' && editedContent && (
        <StoryPreview
          visible={true}
          imageUri={editedContent.imageUri}
          type={editedContent.type || 'image'}
          textElements={editedContent.textElements}
          stickerElements={editedContent.stickerElements}
          forumName={forumName}
          onBack={handleBackFromPreview}
          onPost={handlePost}
        />
      )}
    </>
  )
}

