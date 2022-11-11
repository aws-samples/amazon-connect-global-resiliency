// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, {useState, useEffect, useRef} from 'react'

import { useHistory } from 'react-router-dom'
import { useParams } from 'react-router-dom'

import {
  connectReplicateInstance,
  connectShowInstance,
  connectCreateTrafficDistributionGroup,
  connectListTrafficDistributionGroups,
  connectDeleteTrafficDistributionGroup,
} from '../apis/connectAPI'
import {useAppState} from '../providers/AppStateProvider'
import {
  Badge,
  Box,
  Button,
  Column,
  ColumnLayout,
  componentTypes,
  Container,
  FormRenderer,
  Heading,
  Inline,
  KeyValuePair,
  LoadingIndicator,
  Modal,
  Overlay,
  Stack,
  Table,
  Text,
  validatorTypes,
} from 'aws-northstar'
import ConfirmationModal from '../components/ConfirmationModal'

const Instance = () => {
  const { instanceId } = useParams()
  const { setCurrentConnectInstance, setCurrentTDG, pushNotificationItem } = useAppState()
  const history = useHistory()
  const confirmationModalRef = useRef(null)

  const [instance, setInstance] = useState({})
  const [loading, setLoading] = useState(false)
  const [replicaModalSubmitting, setReplicaModalSubmitting] = useState(false)
  const [replicaModalVisible, setReplicaModalVisible] = useState(false)
  const [tdgLoading, setTDGLoading] = useState(false)
  const [tdgModalVisible, setTdgModalVisible] = useState(false)
  const [trafficDistributionGroups, setTrafficDistributionGroups] = useState([])
  
  let selectedTdg = {}

  useEffect(async () => {
    if (instanceId) {
      await showInstance()
      await listTDG()
    }
    else {
      console.log('No instanceId passed in URL, redirecting back to Home')
      history.replace('/')

    }

  }, [])

  const navigateToTDG = async () => {
    console.debug(`Selected item is ${selectedTdg}`)
    if (selectedTdg.Id) {
      setCurrentTDG(selectedTdg)
      const tdgId = selectedTdg.Id
      history.replace(`/instance/${instanceId}/trafficdistributiongroup/${tdgId}/`)
    }
    else {
      console.error('no items selected')
    }
  }

  /**
   * Table Events
   */

  const onTdgSelectionChange = async (index) => {
    if (trafficDistributionGroups && index.length > 0) {
      selectedTdg = trafficDistributionGroups[index]
    }
  }

  /**
   * Show instance section and actions
   */

  const showInstance = async () => {
    console.log('connectShowInstance')
    setLoading(true)
    try {
      const connectShowInstanceResult = await connectShowInstance(instanceId)
      setInstance(connectShowInstanceResult)
      setCurrentConnectInstance(connectShowInstanceResult)
      console.log('connectShowInstanceResult', connectShowInstanceResult)
      setLoading(false)
    }
    catch (error) {
      console.error('Error showing instance:',error)
      setLoading(false)
      pushNotificationItem({
        header: 'There was an error retrieving instance details',
        content: error.message,
        type: 'error',
        dismissible: true,
      })
    }

  }

  const replicateAction = (
    <Inline>
      <Button
        variant="icon"
        label="refresh"
        icon="refresh"
        onClick={showInstance}
      />
      <Button
        variant="primary"
        label="replicate"
        disabled={instance.Replicated !== 'false'}
        onClick={() => setReplicaModalVisible(true)}
      > Replicate
      </Button>
    </Inline>
  )


  /**
   * Replicate Instance pop-up form and actions
   */
  const connectReplicateForm = async (formFields) => {
    console.debug('connectReplicateInstance')
    setReplicaModalSubmitting(true)
    setLoading(true)

    try {
      const replicaAlias = formFields['replicaInstanceAliasValue']
      const connectReplicateInstanceResult = await connectReplicateInstance(instance.Id, replicaAlias)
      console.log('connectReplicateInstanceResult', connectReplicateInstanceResult)

      pushNotificationItem({
        header: 'Successfully replicated instance. It will take a few moments before the replica becomes available. Please log into the AWS Console to configure the new instance.',
        type: 'success',
        dismissible: true,
      })
    } catch (error) {
      console.error('Error replicating instance', error)
      pushNotificationItem({
        header: 'There was an error replicating the instance',
        content: error.message,
        type: 'error',
        dismissible: true,
      })
    }

    setReplicaModalSubmitting(false)
    setReplicaModalVisible(false)
    setLoading(false)

  }

  const replicateInstanceSchema = {
    fields: [
      {
        component: componentTypes.TEXT_FIELD,
        name: 'replicaInstanceAliasValue',
        label: 'Replica alias',
        isRequired: true,
        validate: [
          {
            type: validatorTypes.REQUIRED,
          },
          {
            type: validatorTypes.PATTERN,
            pattern: /^(?!d-)([\da-zA-Z]+)([-]*[\da-zA-Z])*$/
          }
        ],
      },
    ]
  }

  const replicateModal = (
    <Modal title="Replicate instance" visible={replicaModalVisible} onClose={() => setReplicaModalVisible(false)}>
      <Box marginBottom={2}>
        <Text color={'textSecondary'}>NOTE: Once you create a replica it will be initially empty. You will need to log into the AWS Console and set up any configuration needed before sending any traffic to it.</Text>
      </Box>
      <FormRenderer schema={replicateInstanceSchema} onSubmit={value => connectReplicateForm(value)} onCancel={() => setReplicaModalVisible(false)} isCreateReplicaSubmitting={replicaModalSubmitting}/>
    </Modal>
  )

  /**
   * Remove traffic distribution group confirmation and actions
   */

  const onClickDeleteTdg = async () => {
    if (selectedTdg.Id) {
      confirmationModalRef.current.show('Delete Traffic Distribution Group',
        ['This will delete this traffic distribution group. You cannot delete if there are any phone numbers currently associated with this traffic distribution group.', <br key='1'/>, <br key='2'/>,  'Are you sure you want to continue?'])
    }
  }


  const deleteTdg = async () => {
    console.debug('Deleting tdg:', selectedTdg?.Id)
    setLoading(true)


    //Only proceed if an item is selected
    if (selectedTdg?.Id) {
      try {

        const connectDeleteTrafficDistributionGroupResult = await connectDeleteTrafficDistributionGroup(selectedTdg.Id)
        console.debug('connectDeleteTrafficDistributionGroupResult', connectDeleteTrafficDistributionGroupResult)

        pushNotificationItem({
          header: 'Successfully deleted traffic distribution group. This may take a few moments to complete and you will need to refresh the table to see the updates.',
          type: 'success',
          dismissible: true,
        })

        //Reload TDGs
        await listTDG()

      } catch (error) {
        console.error('Error adding traffic distribution group', error)
        pushNotificationItem({
          header: 'There was an error deleting traffic distribution group:',
          content: error.message,
          type: 'error',
          dismissible: true,
        })
      }
    }
    else {
      console.log('No traffic distribution group selected')
    }
    setLoading(false)


  }

  /**
   * Traffic distribution group table and actions
   */

  const listTDG = async () => {
    console.debug('listTrafficDistributionGroups')
    setTDGLoading(true)

    try {
      const connectListTrafficDistributionGroupsResult = await connectListTrafficDistributionGroups(instanceId)
      setTrafficDistributionGroups(connectListTrafficDistributionGroupsResult)
      console.debug('listTrafficDistributionGroups', connectListTrafficDistributionGroupsResult)

    } catch (error) {
      console.error('error calling listTrafficDistributionGroups', error)

      pushNotificationItem({
        header: 'There was an error loading the traffic distribution groups',
        content: error.message,
        type: 'error',
        dismissible: true,
      })
    }
    setTDGLoading(false)

  }


  const tdgColumnDefinitions = [
    {
      id: 'Name',
      Header: 'Name',
      accessor: 'Name',
      width: 200
    },
    {
      id: 'Id',
      Header: 'Id',
      accessor: 'Id',
      width: 400
    }, 
    {
      id: 'Status',
      Header: 'Status',
      accessor: 'Status',
      width: 100
    }
  ]

  const tdgTableActions = (
    <Inline>
      <Button
        variant="icon"
        label="refresh"
        icon="refresh"
        onClick={listTDG}
      />
      <Button 
        variant='secondary'
        //icon={Remove}
        disabled={instance.PrimaryReplica === false || trafficDistributionGroups.length === 0}
        onClick={onClickDeleteTdg}>
        Delete
      </Button>
      <Button 
        variant='secondary'
        icon="add_plus"
        disabled={instance.Replicated === 'false' || instance.PrimaryReplica === false}
        onClick={() => setTdgModalVisible(true)}>
        Add
      </Button>
      <Button
        variant="primary"
        label="manage"
        onClick={navigateToTDG}
        disabled={trafficDistributionGroups.length === 0}
      >Manage</Button>
    </Inline>
  )



  /**
   * Add traffic distribution group form and actions
   */
  const connectAddTDGForm = async (formFields) => {
    console.debug('connectAddTDGForm', formFields)
    setLoading(true)


    try {
      const name = formFields['tdgName']
      const description = formFields['tdgDescription']
      const connectReplicateInstanceResult = await connectCreateTrafficDistributionGroup(name, description, instanceId)
      console.debug('connectAddTDGForm', connectReplicateInstanceResult)

      //Reload TDGs
      await listTDG()

      pushNotificationItem({
        header: 'Successfully added new traffic distribution group. This may take a few moments to complete and you will need to refresh the table to see the updates.',
        type: 'success',
        dismissible: true,
      })
    } catch (error) {
      console.error('Error adding traffic distribution group', error)
      pushNotificationItem({
        header: 'There was an error adding a new traffic distribution group',
        content: error.message,
        type: 'error',
        dismissible: true,
      })
    }

    setTdgModalVisible(false)
    setLoading(false)

  }


  const addTdgInstanceSchema = {
    fields: [
      {
        component: componentTypes.TEXT_FIELD,
        name: 'tdgName',
        label: 'Name',
        isRequired: true,
        validate: [
          {
            type: validatorTypes.REQUIRED,
          },
          {
            type: validatorTypes.PATTERN,
            pattern: /(^[\S].*[\S]$)|(^[\S]$)/
          }
        ],
      },
      {
        component: componentTypes.TEXTAREA,
        name: 'tdgDescription',
        label: 'Description',
        validate: [
          {
            type: validatorTypes.PATTERN,
            pattern: /(^[\S].*[\S]$)|(^[\S]$)/
          }
        ],
      },
    ]
  }

  const addTDGModal = (
    <Modal title="Add traffic distribution group" visible={tdgModalVisible} onClose={() => setTdgModalVisible(false)}>
      <Box marginBottom={2}>
        <Text color={'textSecondary'}>NOTE: Once your traffic distribution group is created successfully (Status is ACTIVE), you can reassign available phone numbers to it by clicking the Manage button.</Text>
      </Box>
      <FormRenderer schema={addTdgInstanceSchema} onSubmit={value => connectAddTDGForm(value)} onCancel={() => setTdgModalVisible(false)}/>
    </Modal>
  )



  return (
    <div>
      <Box margin={2} >
        <Heading variant='h1'>Instance overview</Heading>

        <Box marginTop={2} >
          <Container
            title="Settings"
            actionGroup={replicateAction}
          >
            <ColumnLayout>
              <Column key="column1">
                <Stack>
                  <Inline><KeyValuePair label="Instance alias" value={instance.InstanceAlias}> </KeyValuePair>  {instance.Replicated === 'true' && instance.PrimaryReplica === false  && instance.ReplicaAlias && <Badge content="Replica" color="blue" />} </Inline>
                  <KeyValuePair label="Id" value={instance.Id}></KeyValuePair>
                  <KeyValuePair label="Arn" value={instance.Arn}></KeyValuePair>
                </Stack>
              </Column>
              <Column key="column2">
                <Stack>
                  <KeyValuePair label="Status" value={instance.InstanceStatus}></KeyValuePair>
                  <KeyValuePair label="Replicated" value={String(instance.Replicated)}></KeyValuePair>
                  {
                    instance.ReplicaAlias && instance.Replicated &&
                    <KeyValuePair label={instance.PrimaryReplica ? 'Replica alias' :  'Replicated from'} value={String(instance.ReplicaAlias) || '-'}></KeyValuePair>
                  }

                </Stack>
              </Column>
            </ColumnLayout>

          </Container>
        </Box>
        <Box>
          <Table
            actionGroup={tdgTableActions}
            tableTitle='Traffic distribution groups'
            tableDescription='These allow you to connect phone numbers and redistribute traffic between instances'
            multiSelect={false}
            columnDefinitions={tdgColumnDefinitions}
            items={trafficDistributionGroups}
            wrapText={true}    
            onSelectedRowIdsChange={onTdgSelectionChange}
            loading={tdgLoading}
            disableSettings = {true}
          />

          {
            instance.PrimaryReplica === false &&
            <Text>NOTE: Traffic distribution groups can only be added in the region of the instance that was originally replicated. </Text>
          }

        </Box>
        {loading &&
        <Overlay>
          <LoadingIndicator size="large" />
        </Overlay>
        }
      </Box>

      {replicateModal}
      {addTDGModal}
      <ConfirmationModal ref={confirmationModalRef} onConfirm={deleteTdg} />
    </div>

  )
}

export default Instance
