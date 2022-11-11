// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Stack, StackProps, CfnOutput, Duration} from "aws-cdk-lib";
import {Construct} from "constructs";
import { NagSuppressions } from 'cdk-nag'

import * as ssm from 'aws-cdk-lib/aws-ssm'
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";

import { FrontendS3DeploymentStack } from '../lib/frontend/frontend-s3-deployment-stack';

const configParams = require('../config.params.json')
export interface CdkFrontendStackProps extends StackProps {
    readonly webAppBucket: s3.IBucket;
    readonly accessLogsBucket: s3.IBucket;
    readonly webAppCloudFrontOAI: cloudfront.IOriginAccessIdentity;
}

export class CdkFrontendStack extends Stack {
    constructor(scope: Construct, id: string, props: CdkFrontendStackProps) {
        super(scope, id, props);

        //store physical stack name to SSM
        const outputHierarchy = `${configParams.hierarchy}outputParameters`;
        const cdkFrontendStackName = new ssm.StringParameter(this, 'CdkFrontendStackName', {
            parameterName: `${outputHierarchy}/CdkFrontendStackName`,
            stringValue: this.stackName
        });

        const frontendS3DeploymentStack = new FrontendS3DeploymentStack(this, 'FrontendS3DeploymentStack', {
            cdkAppName: configParams['CdkAppName'],
            webAppBucket: props.webAppBucket,
            accessLogsBucket: props.accessLogsBucket
        });

        const webAppCloudFrontDistribution = new cloudfront.CloudFrontWebDistribution(this, `${configParams['CdkAppName']}-WebAppDistribution`, {
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: props.webAppBucket,
                        originPath: `/${configParams['WebAppRootPrefix'].replace(/\/$/, "")}`,
                        originAccessIdentity: props.webAppCloudFrontOAI,
                    },
                    behaviors: [
                        {
                            defaultTtl: Duration.minutes(1),
                            isDefaultBehavior: true,
                            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                        },
                    ]
                }
            ],
            errorConfigurations: [{
                errorCode: 403,
                errorCachingMinTtl: 60,
                responsePagePath: '/index.html',
                responseCode: 200
            }],
            loggingConfig: {
                bucket: props.accessLogsBucket,
                includeCookies: false,
                prefix: 'cfaccesslogs',
            }
        });

        //Adding HTTP Security Headers
        const cfnDistribution = webAppCloudFrontDistribution.node.defaultChild as cloudfront.CfnDistribution;

        cfnDistribution.addPropertyOverride(
            'DistributionConfig.DefaultCacheBehavior.ResponseHeadersPolicyId',
            cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS.responseHeadersPolicyId
        );

        NagSuppressions.addResourceSuppressions(webAppCloudFrontDistribution, [
            {
              id: 'AwsSolutions-CFR4',
              reason: 'Using CloudFront Provided Cert which defaults this to TLS1.  Hoping to avoid customer needing to provision cert just to deploy solution.'
            },
        ])

        /**************************************************************************************************************
         * CDK Outputs *
         **************************************************************************************************************/

        new CfnOutput(this, "webAppBucket", {
            value: props.webAppBucket.bucketName
        });

        new CfnOutput(this, "accessLogBucket", {
            value: props.accessLogsBucket.bucketName
        });

        new CfnOutput(this, "webAppURL", {
            value: `https://${webAppCloudFrontDistribution.distributionDomainName}`
        });
    }
}