// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const LambdaUtility = require('../../lib/LambdaUtility');
const AuthUtility = require('../../lib/AuthUtility');
const ConnectService = require('../../services/ConnectService');

exports.handler = async (event, context) => {

    try {
        console.debug(`Event: `, event);
        const currentUser = await AuthUtility.getCurrentUser(event);
        console.info(`Current user: `, currentUser);

        const req = LambdaUtility.parseEventBody(event);

        //Information we need is spread across two calls.
        const connectDescribeTrafficDistributionGroupResult = await ConnectService.describeTrafficDistributionGroup(req.queryStringParameters['trafficDistributionGroupId'])
        console.info('Connect Describe Traffic Distribution Group Result: ', connectDescribeTrafficDistributionGroupResult);

        const connectGetTrafficDistributionResult = await ConnectService.getTrafficDistribution(req.queryStringParameters['trafficDistributionGroupId'])
        console.info('Connect List Traffic Distribution Result: ', connectGetTrafficDistributionResult);

        connectDescribeTrafficDistributionGroupResult.TrafficDistributionGroup.TrafficDistribution = connectGetTrafficDistributionResult;

        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Connect Show Traffic Distribution Group Succeeded!', data: connectDescribeTrafficDistributionGroupResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}