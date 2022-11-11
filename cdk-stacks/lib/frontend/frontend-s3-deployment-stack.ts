// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {NestedStack, NestedStackProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import { NagSuppressions } from 'cdk-nag'

import * as s3deployment from "aws-cdk-lib/aws-s3-deployment";
import * as s3 from "aws-cdk-lib/aws-s3";

const configParams = require('../../config.params.json');

export interface FrontendS3DeploymentStackProps extends NestedStackProps {
    readonly cdkAppName: string;
    readonly webAppBucket: s3.IBucket;
    readonly accessLogsBucket: s3.IBucket;
}

export class FrontendS3DeploymentStack extends NestedStack {

    public readonly webAppBucket: s3.IBucket;
    public readonly accessLogsBucket: s3.IBucket;

    constructor(scope: Construct, id: string, props: FrontendS3DeploymentStackProps) {
        super(scope, id, props);

        NagSuppressions.addStackSuppressions(this, [
            {
              id: 'AwsSolutions-IAM4',
              reason: 'This is the CDK Deployment Bucket.'
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'This is the CDK Deployment Bucket.'
              },
          ])

        const webAppDeployment = new s3deployment.BucketDeployment(this, `${props.cdkAppName}-WebAppDeployment`, {
            destinationBucket: props.webAppBucket,
            retainOnDelete: false,
            destinationKeyPrefix: configParams['WebAppRootPrefix'],
            sources: [
                s3deployment.Source.asset('../webapp/build'),
                s3deployment.Source.bucket(props.webAppBucket, `${configParams['WebAppStagingPrefix']}frontend-config.zip`)
            ]
        });
    }
}