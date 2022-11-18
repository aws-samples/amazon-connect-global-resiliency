// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const routes = {
  HOME: '/',
  INSTANCE: '/instance',
  TRAFFIC_DISTRIBUTION_GROUP: '/instance/:instanceId?/trafficdistributiongroup',
  MANAGE_PHONE_NUMBERS: '/instance/:instanceId?/trafficdistributiongroup/:tdgId?/manageNumbers',
}

export default routes