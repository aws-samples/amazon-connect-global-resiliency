// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { NestedStack, NestedStackProps, RemovalPolicy, Duration } from 'aws-cdk-lib'
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CognitoStackProps extends NestedStackProps {
    readonly SSMParams: any;
    readonly cdkAppName: string;
}

export class CognitoStack extends NestedStack {

    public readonly userPool: cognito.IUserPool;
    public readonly userPoolClient: cognito.IUserPoolClient;
    public readonly userPoolDomain: cognito.CfnUserPoolDomain;

    constructor(scope: Construct, id: string, props: CognitoStackProps) {
        super(scope, id, props);

        //create a User Pool
        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: `${props.cdkAppName}-UserPool`,
            removalPolicy: RemovalPolicy.DESTROY,
            passwordPolicy:{
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
                tempPasswordValidity: Duration.days(7),
            },
            signInAliases: {
                username: false,
                phone: false,
                email: true
            },
            standardAttributes: {
                email: {
                    required: false,   //Cognito bug with federation - If you make a user pool with required email field then the second google login attempt fails (https://github.com/aws-amplify/amplify-js/issues/3526)
                    mutable: true
                }
            },
            userInvitation: {
                emailSubject: "Your Amazon Connect Global Resiliency dashboard temporary password",
                emailBody: "Your Amazon Connect Global Resiliency dashboard username is {username} and temporary password is {####}"
            },
            userVerification: {
                emailSubject: "Verify your new Amazon Connect Global Resiliency dashboard account",
                emailBody: "The verification code to your new Amazon Connect Global Resiliency management dashboard is {####}"
            }
        });

        // any properties that are not part of the high level construct can be added using this method
        const userPoolCfn = userPool.node.defaultChild as cognito.CfnUserPool;
        userPoolCfn.userPoolAddOns = { advancedSecurityMode: "ENFORCED" };

        //SAML Federation
        let cognitoSAML: cognito.CfnUserPoolIdentityProvider | undefined = undefined;
        let supportedIdentityProviders: cognito.UserPoolClientIdentityProvider[] = [];
        let userPoolClientOAuthConfig: cognito.OAuthSettings = {
            scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.COGNITO_ADMIN, cognito.OAuthScope.PROFILE]
        }
        if (props.SSMParams.cognitoSAMLEnabled) {
            cognitoSAML = new cognito.CfnUserPoolIdentityProvider(this, "CognitoSAML", {
                providerName: props.SSMParams.cognitoSAMLIdentityProviderName,
                providerType: 'SAML',
                providerDetails: {
                    MetadataURL: props.SSMParams.cognitoSAMLIdentityProviderURL
                },
                attributeMapping: {
                    "email": "email",
                    "email_verified": "email_verified",
                    "name": "name"
                },
                userPoolId: userPool.userPoolId
            })
            supportedIdentityProviders.push(cognito.UserPoolClientIdentityProvider.custom(cognitoSAML.providerName));
            userPoolClientOAuthConfig = {
                ...userPoolClientOAuthConfig,
                callbackUrls: props.SSMParams.cognitoSAMLCallbackUrls.split(',').map((item: string) => item.trim()),
                logoutUrls: props.SSMParams.cognitoSAMLLogoutUrls.split(',').map((item: string) => item.trim())
            }
        }

        //create a User Pool Client
        const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool: userPool,
            userPoolClientName: 'webappClient',
            generateSecret: false,
            refreshTokenValidity: Duration.hours(72),
            supportedIdentityProviders: supportedIdentityProviders,
            oAuth: userPoolClientOAuthConfig
        });

        if (cognitoSAML) {
            userPoolClient.node.addDependency(cognitoSAML);
        }

        const userPoolDomain = new cognito.CfnUserPoolDomain(this, "UserPoolDomain", {
            domain: props.SSMParams.cognitoDomainPrefix,
            userPoolId: userPool.userPoolId
        });

        /**************************************************************************************************************
        * Stack Outputs *
        **************************************************************************************************************/

        this.userPool = userPool;
        this.userPoolClient = userPoolClient;
        this.userPoolDomain = userPoolDomain;
    }
}