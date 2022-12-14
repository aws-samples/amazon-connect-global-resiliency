// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const ErrorHandler = require('../lib/Error');
const ConnectClient = require('aws-sdk/clients/connect');

import pairedRegionMap from '../constants/PairedRegions'
const currentRegion = process.env.AWS_REGION
const pairedRegion = pairedRegionMap[currentRegion]

import tags from '../constants/Tags'
import customBackoff from '../lib/CommonUtility'

const Connect = new ConnectClient({
	maxRetries: 3,
	retryDelayOptions: { customBackoff },
});

const listInstances = async () => {

	const connectResult = await Connect.listInstances().promise().catch(error => {
		console.error('Connect.listInstances: ', error);
		throw new ErrorHandler(error.statusCode, error.message);
	});

	return connectResult?.InstanceSummaryList;
}

const showInstance = async (instanceId) => {

	const params = {
		InstanceId: instanceId
	}

	const describeInstanceResult = await Connect.describeInstance(params).promise().catch(error => {
		console.error('Connect.describeInstance: ', error);
		throw new ErrorHandler(error.statusCode, error.message);
	});

	const instanceDetails = describeInstanceResult.Instance;

	//CHECK FOR REPLICA
	console.log('currentRegion', currentRegion)
	console.log('pairedRegion', pairedRegion)

	if (pairedRegion && currentRegion !== pairedRegion) {

		const ConnectPairedRegion = new ConnectClient({region: pairedRegion});
		let unknownStatus = false
		const describeInstanceResultPairedRegion = await ConnectPairedRegion.describeInstance(params).promise().catch(error => {
			if (error.name === "ResourceNotFoundException") {
				console.log('ReplicatedInstance not found, continuing');
			}
			else {
				unknownStatus = true
				// If another error has been returned it may indicate an outage in the paired region,
				// we should ensure this does not prevent returning the information for this instance in this region
				console.log('Error evaluating replica, continuing', error.statusCode, error.message);
			}
		});

		if (describeInstanceResultPairedRegion && describeInstanceResultPairedRegion.Instance) {
			instanceDetails['Replicated'] = "true"
			instanceDetails['ReplicaAlias'] = describeInstanceResultPairedRegion.Instance.InstanceAlias

			const instanceCreationTime = instanceDetails.CreatedTime
			const pairedInstanceCreatedTime = describeInstanceResultPairedRegion.Instance.CreatedTime
			instanceDetails['PrimaryReplica'] = instanceCreationTime < pairedInstanceCreatedTime
		}
		else if (unknownStatus) {
			// If an error has been returned it may indicate an outage in the paired region,
			// we should ensure we are not locking the front end by incorrectly returning false for replication
			instanceDetails['Replicated'] = "unable to determine"
		}
		else {
			instanceDetails['Replicated'] = "false"
		}
	}
	else {
		instanceDetails['Replicated'] = "invalid region for replication"
	}

	return instanceDetails;
}

const replicateInstance = async (instanceId, replicaAlias) => {
	const params = {
		InstanceId: instanceId,
		ReplicaRegion: pairedRegion,
		ReplicaAlias: replicaAlias,
		//ClientToken: ''
	}
	console.info('Connect Replicate Instance Params', params)
	const connectResult = await Connect.replicateInstance(params).promise().catch(error => {
		console.error('Connect.replicateInstance: ', error);
		throw new ErrorHandler(error.statusCode, error.message);
	});

	return connectResult;
}

const listTrafficDistributionGroups = async (instanceId, maxResults, nextToken) => {
	const params = {
		MaxResults: maxResults || 10,
		InstanceId: instanceId,
		NextToken: nextToken || ''
	}
	const connectResult = await Connect.listTrafficDistributionGroups(params).promise().catch(error => {
		console.error('Connect.listTrafficDistributionGroups: ', error);
		throw new ErrorHandler(error.statusCode, error.message);
	});

	return connectResult;
}

const createTrafficDistributionGroup = async (trafficDistributionGroupDetails) => {

	//Add in tags, tags passed in will overwrite the standard hardcoded project tags
	trafficDistributionGroupDetails.Tags = {...tags, ...trafficDistributionGroupDetails.Tags}

	const connectResult = await Connect.createTrafficDistributionGroup(trafficDistributionGroupDetails).promise().catch(error => {
		console.error('Connect.createTrafficDistributionGroup: ', error);
		throw new ErrorHandler(error.statusCode, error.message);
	});

	return connectResult;
}


const describeTrafficDistributionGroup = async (trafficDistributionGroupId) => {
	const params = {
		TrafficDistributionGroupId: trafficDistributionGroupId
	}
	const connectResult = await Connect.describeTrafficDistributionGroup(params).promise().catch(error => {
		console.error('Connect.describeTrafficDistributionGroup: ', error);
		throw new ErrorHandler(error.statusCode, error.message);
	});

	return connectResult;

}

const getTrafficDistribution = async (trafficDistributionGroupId) => {
	const params = {
		Id: trafficDistributionGroupId
	}
	const connectResult = await Connect.getTrafficDistribution(params).promise().catch(error => {
		console.error('Connect.getTrafficDistribution: ', error);
		throw new ErrorHandler(error.statusCode, error.message);
	});

	return connectResult;

}

const updateTrafficDistribution = async (trafficDistribution) => {
	const params = trafficDistribution;

	const connectResult = await Connect.updateTrafficDistribution(params).promise().catch(error => {
			console.error('Connect.updateTrafficDistribution: ', error);
			throw new ErrorHandler(error.statusCode, error.message);
	});

	return connectResult;

}


const listPhoneNumbers = async (listPhoneNumberParams) => {
	const connectResult = await Connect.listPhoneNumbersV2(listPhoneNumberParams).promise().catch(error => {
		console.error('Connect.listPhoneNumbersV2: ', error);
		throw new ErrorHandler(error.statusCode, error.message);
	});

	return connectResult;
}


const updatePhoneNumbers = async (targetArn, phoneNumberIds) => {

	if (phoneNumberIds.length > 25){
		throw new ErrorHandler('400', `Only 25 phoneNumberIds are accepted, ${phoneNumberIds.length} were passed.`);
	} else {
		try{
			let response = [];
			let successCnt = 0;
			let errorCnt = 0;

			for (let index = 0; index < phoneNumberIds.length; index++) {
				const phoneNumberId = phoneNumberIds[index];
				const params = {
					PhoneNumberId: phoneNumberId,
					TargetArn: targetArn,
				}
			
				const connectUpdatePhoneNumbersResult = await Connect.updatePhoneNumber(params).promise().catch(error => {
					console.error('Connect.updatePhoneNumber: ', error);
					response.push({
						message: 'error',
						resource: {
							phoneNumberId: phoneNumberId,
							error: error
						},
						status: 500
					})
					errorCnt++;
				});

				console.debug('Connect Update Phone Numbers Result: ', connectUpdatePhoneNumbersResult);
				response.push({
					message: 'success',
					resource: {
						phoneNumberId: phoneNumberId
					},
					status: 200
				})
				successCnt++;
			}
		
			// Following format from https://stackoverflow.com/questions/45442847/rest-api-response-in-partial-success
			return { 
				data: response,
				metadata: {
					failure: errorCnt,
					success: successCnt,
					total: phoneNumberIds.length
				}
			};
		} catch (err){
			console.error('Connect.updatePhoneNumber: ', err);
			throw new ErrorHandler(err.statusCode, err.message);
		}
	}
}

const deleteTrafficDistributionGroup = async (trafficDistributionGroupId) => {
	const params = {
			TrafficDistributionGroupId: trafficDistributionGroupId
	}
	const connectResult = await Connect.deleteTrafficDistributionGroup(params).promise().catch(error => {
			console.error('Connect.DeleteTrafficDistributionGroup: ', error);
			throw new ErrorHandler(error.statusCode, error.message);
	});

	return connectResult;

}

module.exports = {
	listInstances,
	showInstance,
	replicateInstance,
	listTrafficDistributionGroups,
	describeTrafficDistributionGroup,
	getTrafficDistribution,
	createTrafficDistributionGroup,
	listPhoneNumbers,
	updatePhoneNumbers,
	updateTrafficDistribution,
	deleteTrafficDistributionGroup
}