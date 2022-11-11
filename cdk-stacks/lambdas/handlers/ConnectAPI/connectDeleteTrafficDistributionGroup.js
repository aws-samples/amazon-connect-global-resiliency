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
        const connectDeleteTrafficDistributionGroupResult = await ConnectService.deleteTrafficDistributionGroup(req.body['trafficDistributionGroupId']);
        console.info('Connect Delete Traffic Distribution Group Result: ', connectDeleteTrafficDistributionGroupResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Connect Delete Traffic Distribution Group succeeded!', data: connectDeleteTrafficDistributionGroupResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}