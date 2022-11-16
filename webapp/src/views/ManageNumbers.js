// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, {useState, useEffect} from 'react'
import { useParams, useHistory } from 'react-router-dom'

import Box from 'aws-northstar/layouts/Box'
import Button from 'aws-northstar/components/Button'
import Inline from 'aws-northstar/layouts/Inline'
import {Heading, LoadingIndicator, Modal, Overlay} from 'aws-northstar'
import Table from 'aws-northstar/components/Table'
import Tabs from 'aws-northstar/components/Tabs'
import Text from 'aws-northstar/components/Text'

import {useAppState} from '../providers/AppStateProvider'
import {
  connectListPhoneNumbers,
  connectUpdatePhoneNumbers
} from '../apis/connectAPI'

const ManageNumbers = () => {
  const { instanceId } = useParams()
  const { currentConnectInstance, currentTDG, pushNotificationItem } = useAppState()
  const history = useHistory()

  const [loading, setLoading] = useState(false)
  const [phoneNumbersAssociatedToInstance, setPhoneNumbersAssociatedToInstance] = useState([])
  const [phoneNumbersAssociatedToTDG, setPhoneNumbersAssociatedToTDG] = useState([])
  const [reassignPhoneNumberModalVisible, setReassignPhoneNumberModalVisible] = useState(false)
  const [releasePhoneNumberModalVisible, setReleasePhoneNumberModalVisible] = useState(false)

  let selectedInstancePhoneNumberIds = []
  let selectedTDGPhoneNumberIds = []
  const sleep = (ms) => { return new Promise(resolve => setTimeout(resolve, ms)) }

  useEffect(async () => {

    console.debug('currentConnectInstance', currentConnectInstance)
    console.debug('currentTDG', currentTDG)

    if (currentConnectInstance?.Arn && currentTDG?.Arn) {
      await refreshPhoneNumbers()
    }
    // If the instance and TDG data is not loaded then redirect back to the instance page
    // In the future, calls could be made based on the ids in the URL to re-populate these
    else if (instanceId) {
      history.replace(`/instance/${instanceId}`)
    }
    else {
      history.replace('/')
    }

  }, [])

  const refreshPhoneNumbers = async (delay= 0) =>  {
    setLoading(true)
    await sleep(delay)

    const listTDGPhoneNumberResponse = await listPhoneNumbers(currentTDG.Arn)
    setPhoneNumbersAssociatedToTDG(listTDGPhoneNumberResponse)

    //Only load in instance numbers if the user will be able to view and use them
    if (currentConnectInstance.PrimaryReplica) {
      const listInstancePhoneNumberResponse = await listPhoneNumbers(currentConnectInstance.Arn)
      setPhoneNumbersAssociatedToInstance(listInstancePhoneNumberResponse)
    }

    setLoading(false)
  }

  const listPhoneNumbers = async (arn) => {
    try{
      let connectListPhoneNumbersInstanceResult, nextToken
      let accumulated = []

      do {
        connectListPhoneNumbersInstanceResult = await connectListPhoneNumbers({
          MaxResults: 1000,
          TargetArn: arn,
          NextToken: nextToken
        })
        nextToken = connectListPhoneNumbersInstanceResult.NextToken
        accumulated = [...accumulated, ...connectListPhoneNumbersInstanceResult.ListPhoneNumbersSummaryList]
      } while (connectListPhoneNumbersInstanceResult.NextToken)

      return accumulated

    } catch(error){
      pushNotificationItem(
        {
          header: `Error Loading Phone Numbers for Arn: ${arn}`,
          content: error.message,
          type: 'error',
          dismissible: true,
        }
      )
    }
  }

  /**
     * TDG phone number table and actions
     */
  const phoneNumberTableColumnDefinitions = [
    {
      id: 'PhoneNumber',
      width: 150,
      Header: 'Phone number',
      accessor: 'PhoneNumber'
    },
    {
      id: 'PhoneNumberCountryCode',
      width: 100,
      Header: 'Country code',
      accessor: 'PhoneNumberCountryCode'
    },
    {
      id: 'PhoneNumberType',
      width: 100,
      Header: 'Type',
      accessor: 'PhoneNumberType'
    },
  ]

  const tableActionsForTDGNumbers = (
    <Inline>
      <Button
        variant="icon"
        label="refresh"
        icon="refresh"
        onClick={refreshPhoneNumbers}
      />
      {currentConnectInstance.PrimaryReplica === true &&
        <Button variant='secondary' label="ShowDeleteModal" onClick={() => { if (selectedTDGPhoneNumberIds && selectedTDGPhoneNumberIds.length > 0){ setReleasePhoneNumberModalVisible(true)}} }>
          Release to instance
        </Button>
      }
    </Inline>
  )

  const onTDGPhoneNumberSelectionChange = async (index) => {
    console.log('onTDGPhoneNumberSelectionChange', index)
    if (phoneNumbersAssociatedToTDG && phoneNumbersAssociatedToTDG.length > 0 && index.length > 0) {
      selectedTDGPhoneNumberIds = index.map((item) => phoneNumbersAssociatedToTDG[item].PhoneNumberId)
    }
  }

  const releasePhoneNumberClick = async () => {

    console.log('releasePhoneNumber', selectedTDGPhoneNumberIds)
    
    if (selectedTDGPhoneNumberIds && selectedTDGPhoneNumberIds.length > 0){
      try{
        setLoading(true)
        const connectUpdatePhoneNumbersResult = await connectUpdatePhoneNumbers({
          targetArn: currentConnectInstance.Arn,
          phoneNumberIds: selectedTDGPhoneNumberIds
        })
        console.log(connectUpdatePhoneNumbersResult)

        if (connectUpdatePhoneNumbersResult.metadata.success === connectUpdatePhoneNumbersResult.metadata.total){ //Complete Success
          pushNotificationItem(
            {
              header: 'Successfully updated phone numbers. You may need to wait a few minutes and refresh the table to see the changes.',
              type: 'success',
              dismissible: true,
            }
          )

          setReleasePhoneNumberModalVisible(false)
          setLoading(false)
          await refreshPhoneNumbers(2000)

        } else if (connectUpdatePhoneNumbersResult.metadata.error === connectUpdatePhoneNumbersResult.metadata.total) { //Complete Failure
          console.log('error releasing phone numbers')
          setReleasePhoneNumberModalVisible(false)
          setLoading(false)
          pushNotificationItem(
            {
              header: 'Error Releasing Phone Numbers',
              content: connectUpdatePhoneNumbersResult.data.map((item) => `[Phone Number Id: ${item.resource.phoneNumberId} - Status: ${item.status} - Error: (${item.resource.error.statusCode})${item.resource.error.message}]`),
              type: 'error',
              dismissible: true,
            }
          )
        } else { //Something in between.
          console.log('error releasing some phone numbers')
          setReleasePhoneNumberModalVisible(false)
          setLoading(false)
          pushNotificationItem(
            {
              header: 'Error Releasing Some Phone Numbers - Please check results below:',
              content: connectUpdatePhoneNumbersResult.data.map((item) => `[Phone Number Id: ${item.resource.phoneNumberId} - Status: ${item.status} - Error: (${item.resource.error.statusCode})${item.resource.error.message}]`),
              type: 'warning',
              dismissible: true,
            }
          )
        }
      }
      catch (error){
        console.log('error releasing phone number')
        setReleasePhoneNumberModalVisible(false)
        setLoading(false)
        pushNotificationItem(
          {
            header: 'Error Releasing Phone Number',
            content: error.message,
            type: 'error',
            dismissible: true,
          }
        )
      }
    }
    else {
      console.log('no phone numbers selected')
    }
  }

  const releasePhoneNumberModal = ( <Modal title="Release phone number" visible={releasePhoneNumberModalVisible}
    onClose={() => setReleasePhoneNumberModalVisible(false)}>
    <Box marginBottom={2}>
      <Text>This will release the phone numbers from the <b>{currentTDG.Name}</b> traffic distribution group
        and assign them back to your Instance. Are you sure you want to continue?</Text>
    </Box>
    <Inline>
      <Button onClick={() => setReleasePhoneNumberModalVisible(false)}>
                Cancel
      </Button>
      <Button variant='primary' label="ReleaseNumber" onClick={releasePhoneNumberClick}>
        Continue to release number
      </Button>
    </Inline>
  </Modal> )


  /**
     * Add Instance phone number table and actions
     */


  const onInstancePhoneNumberSelectionChange = async (index) => {
    console.log('onInstancePhoneNumberSelectionChange', index)
    if (phoneNumbersAssociatedToInstance && phoneNumbersAssociatedToInstance.length > 0 && index.length > 0) {
      selectedInstancePhoneNumberIds = index.map((item) => phoneNumbersAssociatedToInstance[item].PhoneNumberId)
    }
  }

  const reassignPhoneNumberClick = async () => {
    console.log('addPhoneNumberClick', selectedInstancePhoneNumberIds)

    if (selectedInstancePhoneNumberIds && selectedInstancePhoneNumberIds.length > 0) {

      try{
        setLoading(true)
        const connectUpdatePhoneNumbersResult = await connectUpdatePhoneNumbers({
          targetArn: currentTDG.Arn,
          phoneNumberIds: selectedInstancePhoneNumberIds
        })
        console.log(connectUpdatePhoneNumbersResult)

        if (connectUpdatePhoneNumbersResult.metadata.success === connectUpdatePhoneNumbersResult.metadata.total){ //Complete Success
          pushNotificationItem(
            {
              header: 'Successfully updated phone numbers. You may need to wait a few minutes and refresh the table to see the changes.',
              type: 'success',
              dismissible: true,
            }
          )

          setReassignPhoneNumberModalVisible(false)
          setLoading(false)
          await refreshPhoneNumbers(2000)

        } else if (connectUpdatePhoneNumbersResult.metadata.error === connectUpdatePhoneNumbersResult.metadata.total) { //Complete Failure
          console.log('error assigning phone numbers')
          setReassignPhoneNumberModalVisible(false)
          setLoading(false)
          pushNotificationItem(
            {
              header: 'Error assigning phone numbers to traffic distribution group',
              content: connectUpdatePhoneNumbersResult.data.map((item) => `[Phone Number Id: ${item.resource.phoneNumberId} - Status: ${item.status} - Error: (${item.resource.error.statusCode})${item.resource.error.message}]`),
              type: 'error',
              dismissible: true,
            }
          )
        } else { //Something in between.
          console.log('error assigning some phone numbers')
          setReassignPhoneNumberModalVisible(false)
          setLoading(false)
          pushNotificationItem(
            {
              header: 'Error assigning some phone numbers to traffic distribution group - Please check results below:',
              content: connectUpdatePhoneNumbersResult.data.map((item) => `[Phone Number Id: ${item.resource.phoneNumberId} - Status: ${item.status} - Error: (${item.resource.error.statusCode})${item.resource.error.message}]`),
              type: 'warning',
              dismissible: true,
            }
          )
        }
      }
      catch (error){
        console.log('error releasing phone number')
        setReassignPhoneNumberModalVisible(false)
        setLoading(false)
        pushNotificationItem(
          {
            header: 'Error Assigning Phone Numbers',
            content: error.message,
            type: 'error',
            dismissible: true,
          }
        )
      }
    }
    else {
      console.log('no phone numbers selected')
    }
  }

  const reassignPhoneNumberModal = ( <Modal title="Reassign phone number" visible={reassignPhoneNumberModalVisible}
    onClose={() => setReassignPhoneNumberModalVisible(false)}>
    <Box marginBottom={2}>
      <Text>This will reassign the phone numbers to the <b>{currentTDG.Name}</b> traffic distribution group. This may take a few moments.
        Are you sure you want to continue?</Text>
    </Box>
    <Inline>
      <Button onClick={() => setReassignPhoneNumberModalVisible(false)}>
        Cancel
      </Button>
      <Button variant='primary' label="ReassignNumber" onClick={reassignPhoneNumberClick}>
        Continue to reassign number
      </Button>
    </Inline>
  </Modal> )

  const addPhoneNumberButtons = (
    <Inline>
      <Button
        variant="icon"
        label="refresh"
        icon="refresh"
        onClick={refreshPhoneNumbers}
      />
      <Button variant='primary' label="PerformAdd" onClick={() => { if (selectedInstancePhoneNumberIds && selectedInstancePhoneNumberIds.length > 0) {setReassignPhoneNumberModalVisible(true)}} }>
        Reassign to TDG
      </Button>
    </Inline>)


  const managePhoneNumberTabs = [
    {
      label: 'Current phone numbers',
      id: 'first-tab',
      content:     
        <Box>   
          <Table
            actionGroup={tableActionsForTDGNumbers}
            tableTitle={'Numbers assigned to TDG ' +currentTDG.Name}
            multiSelect={true}
            columnDefinitions={phoneNumberTableColumnDefinitions}
            items={phoneNumbersAssociatedToTDG}
            wrapText={true}
            onSelectedRowIdsChange={ onTDGPhoneNumberSelectionChange }
            disableRowSelect={!currentConnectInstance.PrimaryReplica}
          />
          <Text>
            You can only reassign or release 25 numbers at a time from the dashboard.  If you need to manage numbers in bulk, please consider using the <a target='_blank' rel='noreferrer' href='https://docs.aws.amazon.com/connect/latest/APIReference/API_UpdatePhoneNumber.html'>API</a> directly.
          </Text>
        </Box> 
    }
  ]

  // Only show tab for adding on the primary replica
  if (currentConnectInstance.PrimaryReplica) {
    managePhoneNumberTabs.push(
      {
        label: '+ Assign additional numbers',
        id: 'second-tab',
        content:
        <Box>
          <Table
            tableTitle={'Numbers assigned to instance ' +currentConnectInstance.InstanceAlias}
            actionGroup={addPhoneNumberButtons}
            multiSelect={true}
            columnDefinitions={phoneNumberTableColumnDefinitions}
            items={phoneNumbersAssociatedToInstance}
            wrapText={true}
            disableGroupBy={true}
            disablePagination={false}
            onSelectedRowIdsChange={onInstancePhoneNumberSelectionChange}
          />
          <Text>
            NOTE: to claim a new phone number to use in your TDG use the standard Amazon Connect console, and then reassign it here.<br />
            You can only reassign or release 25 numbers at a time from the dashboard.  If you need to manage numbers in bulk, please consider using the <a target='_blank' rel='noreferrer' href='https://docs.aws.amazon.com/connect/latest/APIReference/API_UpdatePhoneNumber.html'>API</a> directly.
          </Text>
        </Box>
      })
    
  }



  return (
    <div>
      <Box margin={2} >

        <Heading variant='h1'>Manage phone numbers</Heading>

        <Tabs tabs={managePhoneNumberTabs} />

        {releasePhoneNumberModal}
        {reassignPhoneNumberModal}

        {loading &&
              <Overlay>
                <LoadingIndicator size="large" />
              </Overlay>
        }
      </Box>
    </div>

  )
}

export default ManageNumbers
