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
        const connectReplicateInstanceResult = await ConnectService.replicateInstance(req.body['instanceId'], req.body['replicaAlias'])
        console.info('Connect Replicate Instance Result: ', connectReplicateInstanceResult);
        return LambdaUtility.buildLambdaResponse(context, 200, { success: 'Connect Replicate Instance succeeded!', data: connectReplicateInstanceResult });
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
}