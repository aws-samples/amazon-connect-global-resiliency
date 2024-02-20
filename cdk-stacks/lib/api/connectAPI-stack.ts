// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {NestedStack, NestedStackProps, Duration } from "aws-cdk-lib";
import {Construct} from "constructs";

import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as apigw2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigw2Integrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as apigw2Authorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import {CfnStage} from "aws-cdk-lib/aws-apigatewayv2";
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as path from "path";
import { NagSuppressions } from 'cdk-nag'

export interface ConnectAPIStackProps extends NestedStackProps {
    readonly SSMParams: any;
    readonly cognitoUserPool: cognito.IUserPool;
    readonly cognitoUserPoolClient: cognito.IUserPoolClient;
    readonly cdkAppName: string;
}

export class ConnectAPIStack extends NestedStack {

    public readonly connectAPI: apigw2.IHttpApi;

    constructor(scope: Construct, id: string, props: ConnectAPIStackProps) {
        super(scope, id, props);

        NagSuppressions.addStackSuppressions(this, [
            {
              id: 'AwsSolutions-IAM4',
              reason: 'This is the default Lambda Execution Policy which just grants writes to CloudWatch.'
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'These methods are used for multi-region configuration in Connect and need to work on multiple connect instances and regions.  We have scoped these down as much as we can: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonconnect.html'
            }
          ])

        // this layer is only needed until the 2.1236 (or higher) version of aws-sdk is in the lambda runtime https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
        const awsSdkLayer = new lambda.LayerVersion(this, 'awsSdkLayer', {
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-layer')),
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            description: 'The AWS SDK version required for the new Global Resiliency apis',
        });

        // Describe Directory permissions is required for some Amazon Connect operations
        const describeDirectories = new iam.Policy(this, 'DescribeDirectoriesAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["ds:DescribeDirectories"],
                    resources: ['*']
                })
            ]
        })

        const connectListInstancesLambda = new nodeLambda.NodejsFunction(this, 'ConnectListInstancesLambda', {
            functionName: `${props.cdkAppName}-ConnectListInstancesLambda`,
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: 'lambdas/handlers/ConnectAPI/connectListInstances.js',
            timeout: Duration.seconds(30),
            memorySize: 512,
            environment: { }
        });
        connectListInstancesLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectListInstancesAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:ListInstances"],
                    resources: ['*']
                })
            ]
        }));
        connectListInstancesLambda.role?.attachInlinePolicy(describeDirectories);


        const connectShowInstanceLambda = new nodeLambda.NodejsFunction(this, 'connectShowInstanceLambda', {
            functionName: `${props.cdkAppName}-ConnectShowInstanceLambda`,
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: 'lambdas/handlers/ConnectAPI/connectShowInstance.js',
            timeout: Duration.seconds(30),
            memorySize: 512,
            environment: { }
        });
        connectShowInstanceLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectShowInstanceLambdaPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:DescribeInstance"],
                    resources: ['*']
                })
            ]
        }));
        connectShowInstanceLambda.role?.attachInlinePolicy(describeDirectories);

        const connectReplicateInstanceLambda = new nodeLambda.NodejsFunction(this, 'connectReplicateInstanceLambdaPolicy', {
            functionName: `${props.cdkAppName}-ConnectReplicateInstanceLambda`,
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: 'lambdas/handlers/ConnectAPI/connectReplicateInstance.js',
            timeout: Duration.seconds(30),
            memorySize: 512,
            layers: [awsSdkLayer],
            environment: { }
        });
        connectReplicateInstanceLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectReplicateInstanceLambdaPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:ReplicateInstance",
                        "connect:AssociateInstanceStorageConfig",
                        "connect:CreateInstance",
                        "connect:DeleteInstance",
                        "connect:DescribeInstance",
                        "connect:DescribeInstanceAttributes",
                        "connect:DescribeInstanceStorageConfig",
                        "connect:ListApprovedOrigins",
                        "connect:ListInstances",
                        "connect:ListInstanceStorageConfigs",
                        "connect:ListSecurityKeys",
                        "connect:UpdateInstanceAttribute",
                        "ds:AuthorizeApplication",
                        "ds:CheckAlias",
                        "ds:CreateAlias",
                        "ds:CreateDirectory",
                        "ds:CreateIdentityPoolDirectory",
                        "ds:DeleteDirectory",
                        "ds:DescribeDirectories",
                        "ds:UnauthorizeApplication",
                        "iam:CreateServiceLinkedRole",
                        "kms:CreateGrant",
                        "kms:DescribeKey",
                        "kms:ListAliases",
                        "kms:RetireGrant",
                        "logs:CreateLogGroup",
                        "profile:GetDomain",
                        "profile:GetProfileObjectType",
                        "profile:ListAccountIntegrations",
                        "profile:ListDomains",
                        "profile:ListProfileObjectTypeTemplates",
                        "s3:CreateBucket",
                        "s3:GetBucketLocation",
                        "s3:ListAllMyBuckets",
                        "servicequotas:GetServiceQuota"],
                    resources: ['*']
                })
            ]
        }));


        const connectCreateTrafficDistributionGroupLambda = new nodeLambda.NodejsFunction(this, 'connectCreateTrafficDistributionGroupLambda', {
            functionName: `${props.cdkAppName}-connectCreateTrafficDistributionGroupLambda`,
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: 'lambdas/handlers/ConnectAPI/connectCreateTrafficDistributionGroup.js',
            timeout: Duration.seconds(30),
            memorySize: 512,
            layers: [awsSdkLayer],
            environment: { }
        });
        connectCreateTrafficDistributionGroupLambda.role?.attachInlinePolicy(new iam.Policy(this, 'connectCreateTrafficDistributionGroupPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:CreateTrafficDistributionGroup",
                        "connect:TagResource"],
                    resources: ['*']
                })
            ]
        }));


        const connectListTrafficDistributionGroupsLambda = new nodeLambda.NodejsFunction(this, 'connectListTrafficDistributionGroupsLambda', {
            functionName: `${props.cdkAppName}-connectListTrafficDistributionGroupsLambda`,
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: 'lambdas/handlers/ConnectAPI/connectListTrafficDistributionGroups.js',
            timeout: Duration.seconds(30),
            memorySize: 512,
            layers: [awsSdkLayer],
            environment: { }
        });
        connectListTrafficDistributionGroupsLambda.role?.attachInlinePolicy(new iam.Policy(this, 'connectListTrafficDistributionGroupsPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:ListTrafficDistributionGroups"],
                    resources: ['*']
                })
            ]
        }));

        const connectShowTrafficDistributionGroupLambda = new nodeLambda.NodejsFunction(this, 'connecShowTrafficDistributionGroupLambda', {
            functionName: `${props.cdkAppName}-connectShowTrafficDistributionGroupLambda`,
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: 'lambdas/handlers/ConnectAPI/connectShowTrafficDistributionGroup.js',
            timeout: Duration.seconds(30),
            memorySize: 512,
            layers: [awsSdkLayer],
            environment: { }
        });
        connectShowTrafficDistributionGroupLambda.role?.attachInlinePolicy(new iam.Policy(this, 'connectShowTrafficDistributionGroupPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:DescribeTrafficDistributionGroup","connect:GetTrafficDistribution"],
                    resources: ['*']
                })
            ]
        }));

        const connectUpdateTrafficDistributionLambda = new nodeLambda.NodejsFunction(this, 'connectUpdateTrafficDistribution', {
            functionName: `${props.cdkAppName}-connectUpdateTrafficDistribution`,
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: 'lambdas/handlers/ConnectAPI/connectUpdateTrafficDistribution.js',
            timeout: Duration.seconds(30),
            memorySize: 512,
            layers: [awsSdkLayer],
            environment: { }
        });
        connectUpdateTrafficDistributionLambda.role?.attachInlinePolicy(new iam.Policy(this, 'connectUpdateTrafficDistributionGroupsPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:UpdateTrafficDistribution"],
                    resources: ['*']
                })
            ]
        }));

        const connectListPhoneNumbersLambda = new nodeLambda.NodejsFunction(this, 'ConnectListPhoneNumbersLambda', {
            functionName: `${props.cdkAppName}-ConnectListPhoneNumbersLambda`,
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: 'lambdas/handlers/ConnectAPI/connectListPhoneNumbers.js',
            layers: [awsSdkLayer],
            timeout: Duration.seconds(30),
            memorySize: 512,
            environment: { }
        });
        connectListPhoneNumbersLambda.role?.attachInlinePolicy(new iam.Policy(this, 'ConnectListPhoneNumbersAccess', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:ListPhoneNumbersV2"],
                    resources: ['*']
                })
            ]
        }));

        const connectUpdatePhoneNumbersLambda = new nodeLambda.NodejsFunction(this, 'connectUpdatePhoneNumbers', {
            functionName: `${props.cdkAppName}-connectUpdatePhoneNumbers`,
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: 'lambdas/handlers/ConnectAPI/connectUpdatePhoneNumbers.js',
            timeout: Duration.seconds(50), //Setting this a bit larger as we are going to loop through several updates
            memorySize: 512,
            layers: [awsSdkLayer],
            environment: { }
        });
        connectUpdatePhoneNumbersLambda.role?.attachInlinePolicy(new iam.Policy(this, 'connectUpdatePhoneNumbersGroupsPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:UpdatePhoneNumber"],
                    resources: ['*']
                })
            ]
        }));

        const connectDeleteTrafficDistributionGroupLambda = new nodeLambda.NodejsFunction(this, 'connectDeleteTrafficDistributionGroup', {
            functionName: `${props.cdkAppName}-connectDeleteTrafficDistributionGroup`,
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: 'lambdas/handlers/ConnectAPI/connectDeleteTrafficDistributionGroup.js',
            timeout: Duration.seconds(30),
            memorySize: 512,
            layers: [awsSdkLayer],
            environment: { }
        });
        connectDeleteTrafficDistributionGroupLambda.role?.attachInlinePolicy(new iam.Policy(this, 'connectDeleteTrafficDistributionGroupGroupsPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ["connect:DeleteTrafficDistributionGroup"],
                    resources: ['*']
                })
            ]
        }));

        /************* create ConnectAPI Integration *********/

        const connectAPI = new apigw2.HttpApi(this, 'ConnectAPI', {
            apiName: `${props.cdkAppName}-ConnectAPI`,
            corsPreflight: {
                allowOrigins: props.SSMParams.webappAPIAllowedOrigins.split(',').map((item: string) => item.trim()),
                allowMethods: [apigw2.CorsHttpMethod.GET, apigw2.CorsHttpMethod.POST, apigw2.CorsHttpMethod.PUT, apigw2.CorsHttpMethod.DELETE],
                allowHeaders: apigw.Cors.DEFAULT_HEADERS,
            }
        });

        const connectAPIAuthorizer = new apigw2Authorizers.HttpUserPoolAuthorizer('ConnectAPIAuthorizer', props.cognitoUserPool, {
          userPoolClients: [props.cognitoUserPoolClient],
        });

        // Setup the access log for APIGWv2
        const accessLogs = new logs.LogGroup(this, `${props.cdkAppName}-ConnectAPI-AccessLogs`)

        const stage = connectAPI.defaultStage?.node.defaultChild as CfnStage
        stage.accessLogSettings = {
            destinationArn: accessLogs.logGroupArn,
            format: JSON.stringify({
                requestId: '$context.requestId',
                userAgent: '$context.identity.userAgent',
                sourceIp: '$context.identity.sourceIp',
                requestTime: '$context.requestTime',
                requestTimeEpoch: '$context.requestTimeEpoch',
                httpMethod: '$context.httpMethod',
                path: '$context.path',
                status: '$context.status',
                protocol: '$context.protocol',
                responseLength: '$context.responseLength',
                domainName: '$context.domainName'
            })
        }

        const role = new iam.Role(this, 'ApiGWLogWriterRole', {
            assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
          })

        const policy = new iam.PolicyStatement({
        actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams',
            'logs:PutLogEvents',
            'logs:GetLogEvents',
            'logs:FilterLogEvents'
            ],
            resources: ['*']
        })

        role.addToPolicy(policy)
        accessLogs.grantWrite(role)

        connectAPI.addRoutes({
            integration: new apigw2Integrations.HttpLambdaIntegration('connectListInstancesAPI', connectListInstancesLambda),
            path: '/connectListInstances',
            authorizer: connectAPIAuthorizer,
            methods: [apigw2.HttpMethod.GET],
        });

        connectAPI.addRoutes({
            integration: new apigw2Integrations.HttpLambdaIntegration('connectShowInstanceAPI', connectShowInstanceLambda),
            path: '/connectShowInstance',
            authorizer: connectAPIAuthorizer,
            methods: [apigw2.HttpMethod.GET],
        });

        connectAPI.addRoutes({
            integration: new apigw2Integrations.HttpLambdaIntegration('connectReplicateInstanceAPI', connectReplicateInstanceLambda),
            path: '/connectReplicateInstance',
            authorizer: connectAPIAuthorizer,
            methods: [apigw2.HttpMethod.POST],
        });
        connectAPI.addRoutes({
            integration: new apigw2Integrations.HttpLambdaIntegration('connectCreateTrafficDistributionGroupAPI', connectCreateTrafficDistributionGroupLambda),
            path: '/connectCreateTrafficDistributionGroup',
            authorizer: connectAPIAuthorizer,
            methods: [apigw2.HttpMethod.PUT],
        });
        connectAPI.addRoutes({
            integration: new apigw2Integrations.HttpLambdaIntegration('connectListTrafficDistributionGroupsAPI', connectListTrafficDistributionGroupsLambda),
            path: '/connectListTrafficDistributionGroups',
            authorizer: connectAPIAuthorizer,
            methods: [apigw2.HttpMethod.GET],
        });
        connectAPI.addRoutes({
            integration: new apigw2Integrations.HttpLambdaIntegration('connectShowTrafficDistributionGroupAPI', connectShowTrafficDistributionGroupLambda),
            path: '/connectShowTrafficDistributionGroup',
            authorizer: connectAPIAuthorizer,
            methods: [apigw2.HttpMethod.GET],
        });
        connectAPI.addRoutes({
            integration: new apigw2Integrations.HttpLambdaIntegration('connectUpdateTrafficDistributionAPI', connectUpdateTrafficDistributionLambda),
            path: '/connectUpdateTrafficDistribution',
            authorizer: connectAPIAuthorizer,
            methods: [apigw2.HttpMethod.PUT],
        });
        connectAPI.addRoutes({
            integration: new apigw2Integrations.HttpLambdaIntegration('connectListPhoneNumbersAPI', connectListPhoneNumbersLambda),
            path: '/connectListPhoneNumbers',
            authorizer: connectAPIAuthorizer,
            methods: [apigw2.HttpMethod.POST],
        });
        connectAPI.addRoutes({
            integration: new apigw2Integrations.HttpLambdaIntegration('connectUpdatePhoneNumbersAPI', connectUpdatePhoneNumbersLambda),
            path: '/connectUpdatePhoneNumbers',
            authorizer: connectAPIAuthorizer,
            methods: [apigw2.HttpMethod.PUT],
        });
        connectAPI.addRoutes({
            integration: new apigw2Integrations.HttpLambdaIntegration('connectDeleteTrafficDistributionGroupAPI', connectDeleteTrafficDistributionGroupLambda),
            path: '/connectDeleteTrafficDistributionGroup',
            authorizer: connectAPIAuthorizer,
            methods: [apigw2.HttpMethod.DELETE],
        });

        this.connectAPI = connectAPI;

    }
}