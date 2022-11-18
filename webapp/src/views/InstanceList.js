// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, {useEffect, useState} from 'react'
import { useHistory } from 'react-router-dom'

import {Box, LoadingIndicator, Overlay} from 'aws-northstar'
import Button from 'aws-northstar/components/Button'
import Container from 'aws-northstar/layouts/Container'
import Inline from 'aws-northstar/layouts/Inline'
import Table from 'aws-northstar/components/Table'
import Text from 'aws-northstar/components/Text'
import Link from 'aws-northstar/components/Link'

import {connectListInstances} from '../apis/connectAPI'
import routes from '../constants/routes'
import {useAppState} from '../providers/AppStateProvider'

const InstanceList = () => {
  const { pushNotificationItem } = useAppState()
  const history = useHistory()
  
  const [instanceList, setInstanceList] = useState([])
  const [loading, setLoading] = useState()
  
  let selectedInstanceId

  useEffect(async () => {
    await connectListInstancesLoad()
  }, [])

  const connectListInstancesLoad = async () => {
    setLoading(true)

    try{
      console.debug('Calling connectListInstances')
      const connectListInstancesResult = await connectListInstances()

      setInstanceList(connectListInstancesResult)
      console.debug('connectListInstancesResult', connectListInstancesResult)
      setLoading(false)
    } catch (error){
      console.error('Error listing instances', error)
      setLoading(false)
      pushNotificationItem({
        header: 'There was an error retrieving instances',
        content: error.message,
        type: 'error',
        dismissible: true,
      })
    }
  }


  // Available fields on ListConnectInstances: Arn, CreatedTime, Id, IdentityManagementType, InboundCallsEnabled,
  // InstanceAlias, InstanceStatus, OutboundCallsEnabled, ServiceRole
  const columnDefinitions = [
    {
      id: 'id',
      Header: 'Alias',
      accessor: 'InstanceAlias',
      width: 300,
      Cell: e =><Link href={`instance/${e.row.id}`}>{e.value}</Link>
    },
    {
      id: 'status',
      Header: 'Status',
      accessor: 'InstanceStatus',
      width: 120
    },
    {
      id: 'date',
      Header: 'Created',
      accessor: 'Date',
      width: 200
    },
    {
      id: 'arn',
      Header: 'Arn',
      accessor: 'Arn',
      width: 500
    }
  ]

  const navigateToInstance = async () => {
    console.debug(`Selected item is ${selectedInstanceId}`)
    if (selectedInstanceId) {
      history.replace(`${routes.INSTANCE}/${selectedInstanceId}`)
    }
    else {
      console.error('no items selected')
    }
  }

  /**
   * Table Events
   */

  const getRowId = React.useCallback(data => data.Id, [])
  const onConnectInstanceChange = async (id) => {
    console.debug('onConnectInstanceChange', id)
    if (id.length > 0) {
      // multi-select is turned off, so take just the first item
      selectedInstanceId = id[0]
    }
  }

  const tableActions = (
    <Inline>
      <Button
        variant="icon"
        label="refresh"
        icon="refresh"
        onClick={connectListInstancesLoad}
      />
      <Button variant='primary' onClick={navigateToInstance}>
        Manage
      </Button>
    </Inline>
  )

  return (
    <div>

      <Container
        title="Amazon Connect virtual contact center instances"
      >
        <Box marginBottom={2}>
          <Text variant={'span'}>
						Amazon Connect Global Resiliency allows you to set up your Amazon Connect contact center to run across multiple AWS Regions.
						This dashboard provides a front end to interact with the APIs laid out in the <a href='https://docs.aws.amazon.com/connect/latest/adminguide/setup-connect-global-resiliency.html'>Amazon Connect documentation</a>.
						To get started choose an Instance below.
          </Text>
        </Box>

        <Table
          errorText=''
          actionGroup={tableActions}
          tableTitle='Instances'
          multiSelect={false}
          columnDefinitions={columnDefinitions}
          items={instanceList}
          wrapText={true}
          onSelectedRowIdsChange={ onConnectInstanceChange }
          getRowId={getRowId}
          loading={loading}
          disableSettings = {true}
        />

        <Box margin={2}>
          <Text color='secondary' variant={'p'}>NOTE: This dashboard should be deployed into both regions where your initial and replica instances are located so you can use either to redistribute traffic.</Text>
        </Box>

      </Container>
      {loading &&
			<Overlay><LoadingIndicator size="large" />
			</Overlay>
      }

    </div>

  )
}

export default InstanceList