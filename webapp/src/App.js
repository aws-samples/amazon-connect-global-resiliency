// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState, useRef } from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import { AmplifyAuthenticator, AmplifySignIn } from '@aws-amplify/ui-react'
import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-components'
import { Auth } from '@aws-amplify/auth'
import { Badge } from 'aws-northstar'
import Box from 'aws-northstar/layouts/Box'
import BreadcrumbGroup from 'aws-northstar/components/BreadcrumbGroup'
import Header from 'aws-northstar/components/Header'
import Inline from 'aws-northstar/layouts/Inline'
import SignoutButton from './components/SignoutButton'

import './App.css'
import Instance from './views/Instance'
import InstanceList from './views/InstanceList'
import LogoImage from './images/dashboard-logo-light.png'
import ManageNumbers from './views/ManageNumbers'
import Notifications from './components/Notifications'
import TrafficDistributionGroup from './views/TrafficDistributionGroup'
import { useAppConfig } from './providers/AppConfigProvider'
import { useAppState } from './providers/AppStateProvider'
import routes from './constants/routes'

function App({ isFederateLogin, isFederateLogout }) {
  const { authState, setAuthState, setCognitoUser } = useAppState()
  const { cognitoSAMLIdentityProviderName, backendRegion } = useAppConfig()
  const prevAuthState = useRef()

  const [greetingName, setGreetingName] = useState('')
  const [loaded, setLoaded] = useState(false)
  
  const pathname = window.location.pathname

  useEffect(() => {
    if (isFederateLogin) {
      Auth.federatedSignIn({ provider: cognitoSAMLIdentityProviderName }) //automatically init signIn
    }
    else if (isFederateLogout) {
      window.location.href = `${window.location.protocol}//${window.location.host}` //back to root
    }

    return onAuthUIStateChange((nextAuthState, authData) => {
      console.debug(`Auth onAuthUIStateChange >> current is ${prevAuthState.current} while nextAuthState is ${nextAuthState}`)
      if (prevAuthState.current !== nextAuthState) {
        prevAuthState.current = nextAuthState
        handleNextAuthState(nextAuthState)
      }
    })
  }, [])

  const handleNextAuthState = (nextAuthState) => {
    setAuthState(nextAuthState)
    if (nextAuthState === AuthState.SignedIn) {

      const postLoginRedirectURL = getPostLoginRedirectURL()
      if (postLoginRedirectURL && postLoginRedirectURL !== window.location.href) {
        window.location.href = postLoginRedirectURL
      }

      Auth.currentAuthenticatedUser().then(currentUser => {
        const currentUser_Name = currentUser.attributes?.name ? currentUser.attributes?.name : (currentUser.attributes?.email ? currentUser.attributes.email : currentUser.username)
        const currentUser_Username = currentUser.attributes?.email ? currentUser.attributes.email : currentUser.username

        setGreetingName(currentUser_Name)
        setCognitoUser(currentUser_Username, currentUser_Name)

        setLoaded(true)
      }).catch(error => {
        console.log('Error ', error)
      })
    }
    if (nextAuthState === AuthState.SignIn) {
      setPostLoginRedirectURL(window.location.href)
    }
    if (nextAuthState === AuthState.SignedOut) {
      setTimeout(() => {
        console.debug('Logout refresh')
        window.location = window.location.pathname
      }, 500)
    }
  }

  const setPostLoginRedirectURL = (postLoginRedirectURL) => {
    window.sessionStorage.setItem('postLoginRedirectURL', postLoginRedirectURL)
  }

  const getPostLoginRedirectURL = () => {
    const postLoginRedirectURL = window.sessionStorage.getItem('postLoginRedirectURL')
    window.sessionStorage.removeItem('postLoginRedirectURL')
    return postLoginRedirectURL
  }

  return (
    //check if authenticated
    authState === AuthState.SignedIn ? (
      <div className="App">
        <Header logoPath={LogoImage} title='Amazon Connect Global Resiliency Dashboard' rightContent={<Inline><Badge content={backendRegion} color='blue'/><SignoutButton username={greetingName}/></Inline>}/>
        <Router>
          <Notifications/>
          <Box margin={2} >
            {pathname !== '/' && pathname !== '' &&
                    <BreadcrumbGroup rootPath={'InstanceList'}

                      availableRoutes={[
                        { path: '/', exact: true, strict: true },
                        { path: '/instance/:instanceId', exact: true, strict: false },
                        { path: '/instance/:instanceId/trafficDistributionGroup/:tdgId', exact: true, strict: false }
                      ]}
                    />
            }

          </Box>
          < Route exact path="/" component={InstanceList} />
          < Route exact path={`${routes.INSTANCE}/:instanceId?`} component={Instance} />
          < Route exact path={`${routes.TRAFFIC_DISTRIBUTION_GROUP}/:tdgId?`} component={TrafficDistributionGroup} />
          < Route exact path={`${routes.MANAGE_PHONE_NUMBERS}`} component={ManageNumbers} />
        </Router>
      </div >
    ) : (

      <AmplifyAuthenticator style={{ display: 'flex', justifyContent: 'center' }} usernameAlias="email">
        <AmplifySignIn slot="sign-in" hideSignUp={true} usernameAlias="email">
        </AmplifySignIn>
      </AmplifyAuthenticator>

    )
  )
}

export default App