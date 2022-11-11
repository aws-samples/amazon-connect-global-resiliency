// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { NestedStack, NestedStackProps, Duration, CustomResource } from 'aws-cdk-lib';
import {Construct} from "constructs";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from "aws-cdk-lib/aws-s3";
import { NagSuppressions } from 'cdk-nag'

const configParams = require('../../config.params.json');

export interface FrontendConfigStackProps extends NestedStackProps {
    readonly backendStackOutputs: { key: string, value: string }[];
    readonly webAppBucket: s3.IBucket;
    readonly accessLogsBucket: s3.IBucket;
    readonly cdkAppName: string;
}

export class FrontendConfigStack extends NestedStack {

    constructor(scope:  Construct, id: string, props: FrontendConfigStackProps) {
        super(scope, id, props);

        NagSuppressions.addStackSuppressions(this, [
            {
              id: 'AwsSolutions-IAM4',
              reason: 'This is the default Lambda Execution Policy for a CDK Deployment Lambda which just grants writes to CloudWatch.'
            },
          ])

        const buildConfigParameters = () => {
            const result: any = {};
            props.backendStackOutputs.forEach(param => {
                result[param.key] = param.value;
            });
            return JSON.stringify(result);
        }

        // frontend config custom resource
        const frontendConfigLambda = new lambda.Function(this, `FrontendConfigLambda`, {
            functionName: `${props.cdkAppName}-FrontendConfigLambda`,
            runtime: lambda.Runtime.PYTHON_3_9,
            code: lambda.Code.fromAsset('lambdas/custom-resources/frontend-config'),
            handler: 'index.handler',
            timeout: Duration.seconds(120),
            initialPolicy: [new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["s3:PutObject", "s3:DeleteObject"],
                resources: [
                    `${props.webAppBucket.bucketArn}/${configParams['WebAppStagingPrefix']}frontend-config.zip`,
                    `${props.webAppBucket.bucketArn}/${configParams['WebAppRootPrefix']}frontend-config.js`
                ]
            })]
        });

        const frontendConfigCustomResource = new CustomResource(this, `${props.cdkAppName}-FrontendConfigCustomResource`, {
            resourceType: 'Custom::FrontendConfig',
            serviceToken: frontendConfigLambda.functionArn,
            properties: {
                BucketName: props.webAppBucket.bucketName,
                WebAppStagingObjectPrefix: configParams['WebAppStagingPrefix'],
                WebAppRootObjectPrefix: configParams['WebAppRootPrefix'],
                ObjectKey: `frontend-config.js`,
                ContentType: 'text/javascript',
                Content: `window.webappConfig = ${buildConfigParameters()}`
            }
        });
    }
}