// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { RestAPI } from '@aws-amplify/api-rest'
import { Auth } from '@aws-amplify/auth'

export const connectListInstances = async () => {
  let cid = (await Auth.currentSession()).getIdToken().getJwtToken()
  console.log(cid)
  const response = await RestAPI.get('connectAPI', '/connectListInstances', {
    headers: {
      Authorization: cid,
    },
  })
    .catch(error => {
      console.error('Connect List Instances >>', error.response)
      throw new Error(`${error.response.data.message}`)
    })

  //Add formatted date as additional attribute
  try {
    response.data.map(item => {
      if(item.CreatedTime) {
        item.Date = (new Date(item.CreatedTime).toLocaleString())
      } })
  }
  catch (error) {
    //continue, date will  be missing on table, but don't block the API response because of that
  }

  return response.data
}

export const connectShowInstance = async (instanceId) => {
  let cid = (await Auth.currentSession()).getIdToken().getJwtToken()
  console.log(cid)
  const response = await RestAPI.get('connectAPI', `/connectShowInstance?instanceId=${instanceId}`, {
    headers: {
      Authorization: cid,
    }
  })
    .catch(error => {
      console.error('Connect Show Instance >>', error.response)
      throw new Error(`${error.response.data.message}`)
    })
  return response.data
}


export const connectReplicateInstance = async (instanceId, replicaAlias) => {
  let cid = (await Auth.currentSession()).getIdToken().getJwtToken()
  console.log(cid)
  const response = await RestAPI.post('connectAPI', '/connectReplicateInstance', {
    headers: {
      Authorization: cid,
    },
    body: {
      instanceId,
      replicaAlias
    }
  })
    .catch(error => {
      console.error('Connect Replicate Instance >>', error.response)
      throw new Error(`${error.response.data.message}`)
    })
  return response.data
}


export const connectCreateTrafficDistributionGroup = async (name, description, instanceId) => {
  let cid = (await Auth.currentSession()).getIdToken().getJwtToken()
  console.log(cid)
  const response = await RestAPI.put('connectAPI', '/connectCreateTrafficDistributionGroup', {
    headers: {
      Authorization: cid,
    },
    body: {
      name,
      description,
      instanceId
    }
  })
    .catch(error => {
      console.error('Connect Create Traffic Distribution Group >>', error.response)
      throw new Error(`${error.response.data.message}`)
    })
  return response.data
}


export const connectListTrafficDistributionGroups = async (instanceId) => {
  let cid = (await Auth.currentSession()).getIdToken().getJwtToken()
  console.log(cid)
  const response = await RestAPI.get('connectAPI', `/connectListTrafficDistributionGroups?instanceId=${instanceId}`, {
    headers: {
      Authorization: cid,
    }
  })
    .catch(error => {
      console.error('Connect List Traffic Distribution Groups >>', error.response)
      throw new Error(`${error.response.data.message}`)
    })
  return response.data
}

export const connectShowTrafficDistributionGroup = async (trafficDistributionGroupId) => {
  let cid = (await Auth.currentSession()).getIdToken().getJwtToken()
  console.log(cid)
  const response = await RestAPI.get('connectAPI', `/connectShowTrafficDistributionGroup?trafficDistributionGroupId=${trafficDistributionGroupId}`, {
    headers: {
      Authorization: cid,
    }
  })
    .catch(error => {
      console.error('Connect Show Traffic Distribution Group >>', error.response)
      throw new Error(`${error.response.data.message}`)
    })
  return response.data
}

export const connectUpdateTrafficDistribution = async (trafficDistribution) => {
  let cid = (await Auth.currentSession()).getIdToken().getJwtToken()
  console.log(cid)
  const response = await RestAPI.put('connectAPI', '/connectUpdateTrafficDistribution', {
    headers: {
      Authorization: cid,
    },
    body: trafficDistribution
  })
    .catch(error => {
      console.error('Connect Update Traffic Distribution >>', error.response)
      throw new Error(`${error.response.data.message}`)
    })
  return response.data
}

export const connectListPhoneNumbers = async (listPhoneNumberParams) => {
  let cid = (await Auth.currentSession()).getIdToken().getJwtToken()
  console.log(cid)
  const response = await RestAPI.post('connectAPI', '/connectListPhoneNumbers', {
    headers: {
      Authorization: cid,
    },
    body: listPhoneNumberParams
  })
    .catch(error => {
      console.error('Connect List Phone Numbers >>', error.response)
      throw new Error(`${error.response.data.message}`)
    })
  console.log(response)
  return response.data
}

export const connectUpdatePhoneNumbers = async (updatePhoneNumberParams) => {
  let cid = (await Auth.currentSession()).getIdToken().getJwtToken()
  console.log(cid)
  const response = await RestAPI.put('connectAPI', '/connectUpdatePhoneNumbers', {
    headers: {
      Authorization: cid,
    },
    body: updatePhoneNumberParams
  })
    .catch(error => {
      console.error('Connect Update Phone Numbers >>', error.response)
      throw new Error(`${error.response.data.message}`)
    })
  return response
}

export const connectDeleteTrafficDistributionGroup = async (trafficDistributionGroupId) => {
  let cid = (await Auth.currentSession()).getIdToken().getJwtToken()
  console.log(cid)
  const response = await RestAPI.del('connectAPI', '/connectDeleteTrafficDistributionGroup', {
    headers: {
      Authorization: cid,
    },
    body:{trafficDistributionGroupId}
  })
    .catch(error => {
      console.error('Connect Delete Traffic Distribution Group >>', error.response)
      throw new Error(`${error.response.data.message}`)
    })
  return response.data
}