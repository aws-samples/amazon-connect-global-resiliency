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

        const targetArn = req.body.targetArn;
        const phoneNumberIds = req.body.phoneNumberIds;

        if (phoneNumberIds.length > 25){
            return LambdaUtility.buildLambdaResponse(context, 400, { 
                message: `Only 25 phoneNumberIds are accepted, ${phoneNumberIds.length} were passed.`
            });
        } else {
            let response = [];
            let successCnt = 0;
            let errorCnt = 0;

            for (let index = 0; index < phoneNumberIds.length; index++) {
                const phoneNumberId = phoneNumberIds[index];

                try{
                    const connectUpdatePhoneNumbersResult = await ConnectService.updatePhoneNumber(targetArn, phoneNumberId);
                    console.debug('Connect Update Phone Numbers Result: ', connectUpdatePhoneNumbersResult);
                    response.push({
                        message: 'success',
                        resource: {
                            phoneNumberId: phoneNumberId
                        },
                        status: 200
                    })
                    successCnt++;
                } catch (updateError) {
                    response.push({
                        message: 'error',
                        resource: {
                            phoneNumberId: phoneNumberId,
                            error: updateError
                        },
                        status: 500
                    })
                    errorCnt++;
                }
            }
        
            // Following format from https://stackoverflow.com/questions/45442847/rest-api-response-in-partial-success
            return LambdaUtility.buildLambdaResponse(context, 207, { 
                data: response,
                metadata: {
                failure: errorCnt,
                success: successCnt,
                total: phoneNumberIds.length
            } });
        }
    }
    catch (error) {
        console.error(error);
        return LambdaUtility.buildLambdaResponse(context, error.statusCode || 500, { message: error.message });
    }
  
}