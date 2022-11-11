// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from 'react'

import {Auth} from 'aws-amplify'
import Button from 'aws-northstar/components/Button'
import Text from 'aws-northstar/components/Text'
import Inline from 'aws-northstar/layouts/Inline'

function SignoutButton(props) {
  const signOut = (e) => {
    e.preventDefault()
    console.log('sign out')
    Auth.signOut()
      .then(() => window.location.reload())
      .catch(error => console.log(error))
  }
  return (
    <Inline spacing={'s'}>
      <Text>{props.username}</Text>
      <Button variant={'primary'} onClick={signOut}>
        Sign out
      </Button>
    </Inline>
  )
}

export default SignoutButton