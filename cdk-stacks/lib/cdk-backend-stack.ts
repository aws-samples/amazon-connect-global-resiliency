// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {CfnOutput, RemovalPolicy, Stack, StackProps} from "aws-cdk-lib";
import {Construct} from "constructs";

import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

import { loadSSMParams } from '../lib/infrastructure/ssm-params-util';

import { CognitoStack } from '../lib/infrastructure/cognito-stack';
import { ConnectAPIStack } from '../lib/api/connectAPI-stack';
import { FrontendConfigStack } from '../lib/frontend/frontend-config-stack';
import { NagSuppressions } from 'cdk-nag'

const configParams = require('../config.params.json');

export class CdkBackendStack extends Stack {

  public readonly webAppBucket: s3.IBucket;
  public readonly accessLogsBucket: s3.IBucket;
  public readonly webAppCloudFrontOAI: cloudfront.IOriginAccessIdentity;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //store physical stack name to SSM
    const outputHierarchy = `${configParams.hierarchy}outputParameters`;
    const cdkBackendStackName = new ssm.StringParameter(this, 'CdkBackendStackName', {
      parameterName: `${outputHierarchy}/CdkBackendStackName`,
      stringValue: this.stackName
    });

    const ssmParams = loadSSMParams(this);

    // create infrastructure stacks

    const cognitoStack = new CognitoStack(this, 'CognitoStack', {
      SSMParams: ssmParams,
      cdkAppName: configParams['CdkAppName']
    });

    //create API stacks
    const connectAPIStack = new ConnectAPIStack(this, 'ConnectAPIStack', {
      SSMParams: ssmParams,
      cognitoUserPool: cognitoStack.userPool,
      cognitoUserPoolClient: cognitoStack.userPoolClient,
      cdkAppName: configParams['CdkAppName'],
    });
    connectAPIStack.addDependency(cognitoStack);

    //create log bucket
    const accessLogsBucket = new s3.Bucket(this, "accessLogsBucket", {
      bucketName: `${configParams['CdkAppName']}-AccessLogsBucket-${this.account}-${this.region}`.toLowerCase(),
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    NagSuppressions.addResourceSuppressions(accessLogsBucket, [
        {
          id: 'AwsSolutions-S1',
          reason: 'This is the Log Bucket.'
        },
    ])

    //create webapp bucket
    const webAppBucket = new s3.Bucket(this, "WebAppBucket", {
      bucketName: `${configParams['CdkAppName']}-WebAppBucket-${this.account}-${this.region}`.toLowerCase(),
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: 'webapp',
    });

    const webAppCloudFrontOAI = new cloudfront.OriginAccessIdentity(this, `${configParams['CdkAppName']}-WebAppOAI`,);

    //create frontend config
    const frontendConfigStack = new FrontendConfigStack(this, 'FrontendConfigStack', {
      cdkAppName: configParams['CdkAppName'],
      webAppBucket: webAppBucket,
      accessLogsBucket: accessLogsBucket,
      backendStackOutputs: [
        { key: 'userPoolId', value: cognitoStack.userPool.userPoolId },
        { key: 'userPoolWebClientId', value: cognitoStack.userPoolClient.userPoolClientId },
        { key: 'cognitoDomainURL', value: `https://${cognitoStack.userPoolDomain.domain}.auth.${this.region}.amazoncognito.com` },
        { key: 'connectAPI', value: `${connectAPIStack.connectAPI.apiEndpoint}/` },
        { key: 'backendRegion', value: this.region },
        { key: 'cognitoSAMLEnabled', value: String(ssmParams.cognitoSAMLEnabled) },
        { key: 'cognitoSAMLIdentityProviderName', value: ssmParams.cognitoSAMLIdentityProviderName },
      ]
    });
    frontendConfigStack.addDependency(cognitoStack);
    frontendConfigStack.addDependency(connectAPIStack);


    /**************************************************************************************************************
      * CDK Outputs *
    **************************************************************************************************************/

    this.webAppBucket = webAppBucket;
    this.accessLogsBucket = accessLogsBucket;
    this.webAppCloudFrontOAI = webAppCloudFrontOAI;

    new CfnOutput(this, "userPoolId", {
      value: cognitoStack.userPool.userPoolId
    });
  }
}
