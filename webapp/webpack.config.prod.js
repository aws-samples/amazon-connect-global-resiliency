// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { merge } = require('webpack-merge')
const commonConfig = require('./webpack.config.common')

module.exports = merge(commonConfig, {
  mode: 'production',
  output : { publicPath : '/'},
})