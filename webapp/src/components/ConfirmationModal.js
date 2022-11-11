// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState, forwardRef } from 'react'

import {
  Modal,
  Button,
  Inline,
  Text,
  Box
} from 'aws-northstar'

const ConfirmationModal = forwardRef((props, ref) => {
  const [message, setMessage] = useState()
  const [title, setTitle] = useState()
  const [visible, setVisible] = useState(false)

  const show = (title, message) => {
    setTitle(title)
    setMessage(message)
    setVisible(true)
  }

  ref.current = {
    show
  }

  const confirmClickHandler = async () => {
    if (typeof props.onConfirm === 'function') {
      props.onConfirm()
      setVisible(false)
    }
  }
  return (
    <Modal title={title} visible={visible} onClose={() => setVisible(false)}>
      <Text>{message}</Text>
      <Box marginTop={2} display="flex" justifyContent="flex-end">
        <Inline spacing="1px">
          <Button variant='link' onClick={() => setVisible(false)}>
                Cancel
          </Button>
          <Button variant='primary' onClick={() => confirmClickHandler()}>
                Confirm
          </Button>
        </Inline>
      </Box>
    </Modal>
  )
})
ConfirmationModal.displayName = 'ConfirmationModal'
export default ConfirmationModal
