import { useCallback, useState } from 'react'
import { ALERT_TYPES, CustomAlert } from '../components/CustomAlert'

export function useCustomAlert() {
  const [alert, setAlert] = useState({
    visible: false,
    type: ALERT_TYPES.CONFIRM,
    title: '',
    message: '',
    buttons: [],
  })

  const showAlert = useCallback(
    (config) => {
      setAlert({
        visible: true,
        type: config.type || ALERT_TYPES.CONFIRM,
        title: config.title || 'Alert',
        message: config.message || '',
        buttons: config.buttons || [],
      })
    },
    []
  )

  const hideAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, visible: false }))
  }, [])

  const showConfirm = useCallback(
    (title, message, onConfirm, onCancel) => {
      showAlert({
        type: ALERT_TYPES.CONFIRM,
        title,
        message,
        buttons: [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              hideAlert()
              onCancel?.()
            },
          },
          {
            text: 'Confirm',
            style: 'primary',
            onPress: () => {
              hideAlert()
              onConfirm?.()
            },
          },
        ],
      })
    },
    [showAlert, hideAlert]
  )

  const showDelete = useCallback(
    (title, message, onDelete, onCancel) => {
      showAlert({
        type: ALERT_TYPES.DELETE,
        title,
        message,
        buttons: [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              hideAlert()
              onCancel?.()
            },
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              hideAlert()
              onDelete?.()
            },
          },
        ],
      })
    },
    [showAlert, hideAlert]
  )

  const showSuccess = useCallback(
    (title, message, onDismiss) => {
      showAlert({
        type: ALERT_TYPES.SUCCESS,
        title,
        message,
        buttons: [
          {
            text: 'OK',
            style: 'primary',
            onPress: () => {
              hideAlert()
              onDismiss?.()
            },
          },
        ],
      })
    },
    [showAlert, hideAlert]
  )

  const showError = useCallback(
    (title, message, onDismiss) => {
      showAlert({
        type: ALERT_TYPES.ERROR,
        title,
        message,
        buttons: [
          {
            text: 'OK',
            style: 'primary',
            onPress: () => {
              hideAlert()
              onDismiss?.()
            },
          },
        ],
      })
    },
    [showAlert, hideAlert]
  )

  const AlertComponent = () => (
    <CustomAlert
      visible={alert.visible}
      onClose={hideAlert}
      type={alert.type}
      title={alert.title}
      message={alert.message}
      buttons={alert.buttons}
      onButtonPress={(action) => {
        // Handle button press logic here if needed
      }}
    />
  )

  return {
    showAlert,
    hideAlert,
    showConfirm,
    showDelete,
    showSuccess,
    showError,
    AlertComponent,
  }
}
