// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useContext, useState } from 'react'

const AppStateContext = React.createContext(null)

export function useAppState() {
  const state = useContext(AppStateContext)

  if (!state) {
    throw new Error('useAppState must be used within AppStateProvider')
  }

  return state
}

export function AppStateProvider({ children }) {
  const [authState, setAuthState] = useState('')
  const [cognitoName, setCognitoName] = useState('')
  const [cognitoUsername, setCognitoUsername] = useState('')
  const [currentConnectInstance, setCurrentConnectInstance] = useState({})
  const [currentTDG, setCurrentTDG] = useState({})
  const [notificationItem, setNotificationItem] = useState({})


  const setCognitoUser = (
    iCognitoUsername,
    iCognitoName
  ) => {
    console.log(`AppStateProvider >> setCognitoUser >> ${iCognitoUsername}  > ${iCognitoName}`)
    setCognitoUsername(iCognitoUsername)
    setCognitoName(iCognitoName)
  }

  const pushNotificationItem = (item) => {
    setNotificationItem(item) 
  }

  const providerValue = {
    cognitoName,
    cognitoUsername,
    authState,
    setCognitoUser,
    setAuthState,
    currentConnectInstance,
    setCurrentConnectInstance,
    currentTDG,
    setCurrentTDG,
    notificationItem,
    pushNotificationItem
  }

  return (
    <AppStateContext.Provider value={providerValue}>
      {children}
    </AppStateContext.Provider>
  )
}