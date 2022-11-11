// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

//const ErrorHandler = require('../lib/Error');

const getUserFromJWT = async (cognitoIdToken) => {


    const tokenSections = cognitoIdToken.split('.');
    if (tokenSections.length < 2) {
        throw new Error('Requested token is invalid');
    }
    const payloadJSON = Buffer.from(tokenSections[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadJSON);

    return {
        username: payload['cognito:username'],
        cognito_groups: payload['cognito:groups'],
        email: payload['email'],
    }
}


const getCurrentUser = async (req) => {
    return await getUserFromJWT(req.headers.authorization);
}

module.exports = {
    getCurrentUser
}