// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, {useState, useEffect, useRef} from 'react'
import {useParams} from 'react-router-dom'
import { useHistory } from 'react-router-dom'

import Button from 'aws-northstar/components/Button'
import {
  Box,
  Column,
  ColumnLayout,
  Form,
  FormField,
  Heading,
  Select,
  Input,
  KeyValuePair,
  Modal,
  Stack, 
  Overlay,
  LoadingIndicator
} from 'aws-northstar'
import Container from 'aws-northstar/layouts/Container'
import Inline from 'aws-northstar/layouts/Inline'

import ConfirmationModal from '../components/ConfirmationModal'
import { connectShowTrafficDistributionGroup, connectUpdateTrafficDistribution, connectListTrafficDistributionGroups, connectShowInstance } from '../apis/connectAPI'
import { useAppState } from '../providers/AppStateProvider'

const TrafficDistributionGroup = () => {
  const { tdgId, instanceId } = useParams()
  const { pushNotificationItem, currentConnectInstance, setCurrentConnectInstance, currentTDG,setCurrentTDG } = useAppState()
  const history = useHistory()
  const confirmationModalRef = useRef(null)

  const [editTDModalVisible, setEditTDModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [region1, setRegion1] = useState()
  const [region1Pct, setRegion1Pct] = useState()
  const [region1SelectPct, setRegion1SelectPct] = useState()
  const [region2, setRegion2] = useState()
  const [region2Pct, setRegion2Pct] = useState()
  const [tdg, setTDG] = useState({})

  const pctOptions = [
    { label: '0%', value: '0' },
    { label: '10%', value: '10' },
    { label: '20%', value: '20' },
    { label: '30%', value: '30' },
    { label: '40%', value: '40' },
    { label: '50%', value: '50' },
    { label: '60%', value: '60' },
    { label: '70%', value: '70' },
    { label: '80%', value: '80' },
    { label: '90%', value: '90' },
    { label: '100%', value: '100' }
  ]

  useEffect(async () => {
    if (currentTDG.Arn) {
      await showTDG(currentTDG.Arn)
    }
    else if(instanceId && tdgId) {
      //page refresh or direct link - need to fetch tdgs so we can find the ARN of the given tdg.Id as ids are the same across regions
      setLoading(true)
      try {
        const connectShowInstanceResult = await connectShowInstance(instanceId)
        setCurrentConnectInstance(connectShowInstanceResult)
        console.debug('connectShowInstanceResult', connectShowInstanceResult)

        const connectListTrafficDistributionGroupsResult = await connectListTrafficDistributionGroups(instanceId)
        console.debug('listTrafficDistributionGroups', connectListTrafficDistributionGroupsResult)
        const foundTdg = connectListTrafficDistributionGroupsResult.find(x => x.Id === tdgId)
        if (foundTdg){
          await showTDG(foundTdg.Arn)
        } else {
          throw new Error('Unknown Traffic Distribution Group.')
        }
        

      } catch (error) {
        console.error('error calling retrieving instance or traffic distribution groups', error)
        setLoading(false)
        pushNotificationItem({
          header: 'There was an error loading the instance or traffic distribution groups',
          content: error.message,
          type: 'error',
          dismissible: true,
        })
      }
    }
    else {
      console.error('No instanceId or tdgId passed in URL')
      //If the params are missing in the URL navigate back to Home
      history.replace('/')
    }

  }, [])

  const navigateToManageNumbers = async () => {
    history.replace(`/instance/${instanceId}/trafficdistributiongroup/${tdgId}/managenumbers`)
  }

  /**
   * Show traffic distribution group
   */
  const showTDG = async (arn) => {
    console.debug('show TDG:', currentTDG)
    try{
      setLoading(true)
      const connectShowTrafficDistributionGroupResult = await connectShowTrafficDistributionGroup(arn)
      console.debug(connectShowTrafficDistributionGroupResult)
      const td = connectShowTrafficDistributionGroupResult.TrafficDistributionGroup
      setTDG(td)
      setCurrentTDG(td)

      td.TrafficDistribution.TelephonyConfig.Distributions.forEach((dist, index) => {
        if(index === 0){
          setRegion1(dist.Region)
          setRegion1Pct(dist.Percentage)
          setRegion1SelectPct(pctOptions.find(o => o.value === dist.Percentage + ''))
        } else {
          setRegion2(dist.Region)
          setRegion2Pct(dist.Percentage)
        }
      })

      setLoading(false)
    }
    catch (error){
      console.error('error retrieving traffic distribution group', error)
      setLoading(false)
      pushNotificationItem({
        header: 'There was an error loading the traffic distribution group',
        content: error.message,
        type: 'error',
        dismissible: true,
      })
    }
  }

  const submitTDGForm = async (formFields) => {
    console.log(formFields)
    confirmationModalRef.current.show('Update traffic distribution',['This will change the traffic distribution to your Contact Centers. It may take a few minutes to become effective.',<br key='1'/>,<br key='2'/>, 'Are you sure you want to continue?'])
  }

  const updateTD = async () => {
    console.debug('Update TD')
    setLoading(true)

    const td = tdg.TrafficDistribution
    const tdArn = td.Arn

    //Need to swap out the Id for ARN as that works in both regions.
    td.Id = tdArn

    // remove ARN as Update doesn't like it.
    delete td.Arn

    td.TelephonyConfig.Distributions.forEach((dist, index) => {
      if(index === 0) {
        dist.Percentage = region1Pct
      } else {
        dist.Percentage = region2Pct
      }
    })

    try { 
      const connectUpdateTrafficDistributionResult = await connectUpdateTrafficDistribution(td)
      console.log(connectUpdateTrafficDistributionResult)
      pushNotificationItem({
        header: 'Successfully Updated traffic distribution',
        type: 'success',
        dismissible: true,
      })
      await showTDG(tdArn)
    } catch (error) {
      pushNotificationItem({
        header: 'There was an error updating the traffic distribution',
        content: error.message,
        type: 'error',
        dismissible: true,
      })
    }

    setLoading(false)
    setEditTDModalVisible(false)
  }


  const handleRegion1PctChange = async (event) => {
    let region1Pct = event.target.value
    setRegion1SelectPct(pctOptions.find(o => o.value === region1Pct))
    setRegion1Pct(region1Pct)
    setRegion2Pct(100 - region1Pct)
  }

  const editTDModal = (
    <Modal title={tdg.Name} visible={editTDModalVisible} onClose={() => setEditTDModalVisible(false)}>
      <Form
        actions={
          <div>
            <Button variant="link" onClick={() => setEditTDModalVisible(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitTDGForm}>Submit</Button>
          </div>
        }>

        <FormField label={region1} controlId="region1PctSelect">
          <Select
            onChange={handleRegion1PctChange}
            selectedOption={region1SelectPct}
            controlId="formFieldId3"
            options={pctOptions}
          />
        </FormField>
        <FormField label={region2} controlId="Region2PctInput">
          <Input value={region2Pct} disabled={true} type="text" />
        </FormField>
      </Form>
    </Modal>
  )
  const handleManageNumbersClick = async () => {
    console.log('handleManageNumbersClick')
    await navigateToManageNumbers()
  }

  const editTDAction = (
    <Inline>
      <Button
        variant="primary"
        label="editTDG"
        onClick={() => setEditTDModalVisible(true)}
      > Redistribute traffic
      </Button>
    </Inline>
  )

  return (
    <div>
      <Box margin={2} >
        <Heading variant='h1'>Traffic distribution group overview</Heading>
    
        <Box marginTop={2} >
          <Container
            title="Overview"
          >
            <ColumnLayout>
              <Column key="column1">
                <Stack>
                  <KeyValuePair label="Name" value={tdg.Name}></KeyValuePair>
                  <KeyValuePair label="Description" value={tdg.Description}></KeyValuePair>
                </Stack>
              </Column>
              <Column key="column2">
                <Stack>
                  <KeyValuePair label="Id" value={tdg.Id}></KeyValuePair>
                  <KeyValuePair label="Arn" value={tdg.Arn}></KeyValuePair>
                </Stack>
              </Column>
            </ColumnLayout>
          </Container>
        </Box>
        <Box marginTop={2} paddingTop={2} paddingBottom={0.5} paddingLeft={1} paddingRight={1} bgcolor="primary.main" >
          <Container
            title="Traffic Distribution"
            subtitle="This shows how your telephony traffic is distributed across the linked instances"
            actionGroup={editTDAction}
          >
            <ColumnLayout>
              <Column key="column1">
                <Stack>
                  <KeyValuePair label={tdg.TrafficDistribution?.TelephonyConfig?.Distributions[0]?.Region} value={(tdg.TrafficDistribution?.TelephonyConfig?.Distributions[0]?.Percentage || '0') + ' %'}></KeyValuePair>
                </Stack>
              </Column>
              <Column key="column2">
                <Stack>
                  <KeyValuePair label={tdg.TrafficDistribution?.TelephonyConfig?.Distributions[1]?.Region} value={(tdg.TrafficDistribution?.TelephonyConfig?.Distributions[1]?.Percentage || '0') + ' %'}></KeyValuePair>
                </Stack>
              </Column>
            </ColumnLayout>
          </Container>
        </Box>
        <Box marginTop={2} >
          <Container
            title="Phone numbers"
          >
            <Inline>
              <Button
                variant="primary"
                label="Edit"
                onClick={handleManageNumbersClick}
              >
                {currentConnectInstance.PrimaryReplica === true &&
                'Manage phone numbers' }
                {!currentConnectInstance.PrimaryReplica &&
                'View phone numbers' }
              </Button>
            </Inline>
          </Container>

        </Box>

        {loading &&
            <Overlay>
              <LoadingIndicator size="large" />
            </Overlay>
        }
      </Box>
      {editTDModal}
      <ConfirmationModal ref={confirmationModalRef} onConfirm={updateTD} />
    </div>
  )
}
    
export default TrafficDistributionGroup