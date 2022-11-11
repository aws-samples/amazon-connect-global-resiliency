// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from 'react'
import ReactDOM from 'react-dom'

import { Amplify } from '@aws-amplify/core'
import NorthStarThemeProvider from 'aws-northstar/components/NorthStarThemeProvider'

import App from './App'
import { AppConfigProvider } from './providers/AppConfigProvider'
import { AppStateProvider } from './providers/AppStateProvider'
import './index.css'

const isFederateLogin = window.location.search === '?federate' ? true : false
const isFederateLogout = window.location.search === '?logout' ? true : false
const webappConfig = window.webappConfig

//Configure Amplify - using CDK outputs
const amplifyAuthConfig = {
  userPoolId: webappConfig.userPoolId,
  userPoolWebClientId: webappConfig.userPoolWebClientId,
  region: webappConfig.backendRegion
}

//federation
if (webappConfig.cognitoSAMLEnabled === 'true') {
  amplifyAuthConfig['oauth'] = {
    domain: webappConfig.cognitoDomainURL.replace(/(^\w+:|^)\/\//, ''),
    scope: ['email', 'openid', 'aws.cognito.signin.user.admin', 'profile'],
    redirectSignIn: `${window.location.protocol}//${window.location.host}`,
    redirectSignOut: `${window.location.protocol}//${window.location.host}/?logout`,
    responseType: 'code',
    label: 'Sign in with SSO',
    customProvider: 'AWSSSO'
  }
}

const amplifyAPIConfig = {
  endpoints: [
    {
      name: 'connectAPI',
      endpoint: webappConfig.connectAPI.replace(/\/$/, ''),
      region: amplifyAuthConfig.region
    },
  ]
}

Amplify.configure({
  Auth: amplifyAuthConfig,
  API: amplifyAPIConfig
})

ReactDOM.render(
  <React.StrictMode>
    <NorthStarThemeProvider>
      <AppConfigProvider webappConfig={webappConfig}>
        <AppStateProvider>
          <App isFederateLogin={isFederateLogin} isFederateLogout={isFederateLogout} />
        </AppStateProvider>
      </AppConfigProvider>
    </NorthStarThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
