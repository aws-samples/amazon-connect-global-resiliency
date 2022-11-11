// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState }  from 'react'

import { Flashbar } from 'aws-northstar'

import { useAppState } from '../providers/AppStateProvider'

const Notifications = () => {
  const { notificationItem, pushNotificationItem } = useAppState()
  const [items, setItems] = useState([])

  /*
  This limits to just one notification at a time. Consider moving to a Provider in v2.
  */
  const onNotificationDismiss = () => {
    pushNotificationItem({})
    setItems([])
  }

  useEffect(() => {
    if(notificationItem.type){ // Flashbar will allow the render of an empty object
      notificationItem.onDismiss = onNotificationDismiss
      setItems(items => [...items, notificationItem])
    }
  }, [notificationItem]) 

  return (
    <Flashbar items={items} />
  )
}

export default Notifications