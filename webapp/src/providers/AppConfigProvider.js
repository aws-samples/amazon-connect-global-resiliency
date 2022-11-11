// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useContext } from 'react'

const AppConfigContext = React.createContext(null)

export function useAppConfig() {
  const config = useContext(AppConfigContext)

  if (!config) throw new Error('useAppConfig must be used within AppConfigProvider')

  return config
}

export function AppConfigProvider({ webappConfig, children }) {

  const cognitoSAMLEnabled = getBoolParamValue(webappConfig.cognitoSAMLEnabled)
  const cognitoSAMLIdentityProviderName = getParamValue(webappConfig.cognitoSAMLIdentityProviderName)
  const backendRegion = getParamValue(webappConfig.backendRegion)


  const providerValue = {
    cognitoSAMLEnabled,
    cognitoSAMLIdentityProviderName,
    backendRegion
  }

  return (
    <AppConfigContext.Provider value={providerValue}>
      {children}
    </AppConfigContext.Provider>
  )

}

function getParamValue(param) {
  const SSM_NOT_DEFINED = 'not-defined'
  if (param === SSM_NOT_DEFINED) return undefined
  return param
}

function getBoolParamValue(param) {
  return param === 'true'
}