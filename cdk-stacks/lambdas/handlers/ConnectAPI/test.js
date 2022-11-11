// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const ConnectClient = require('aws-sdk/clients/connect');
const Connect = new ConnectClient({region: 'us-east-1'});

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

const listPhoneNumbersNew = async (retry=0) => {

  const params = {
    "MaxResults": 1000,
    "TargetArn": "arn:aws:connect:us-east-1:185413295518:instance/976e1e84-30e9-4177-b147-df4c1736e28a"
  }
  let connectResult = {}

  try {
    connectResult = await Connect.listPhoneNumbersV2(params).promise()
  }
  catch(error) {

    if (error.statusCode === 429 && retry <= 3) {
      console.error('Connect.listPhoneNumbersV2 Throttled, waiting and then retrying : ', retry, error);
      await wait(500*(retry+1));
      connectResult = await listPhoneNumbers(retry++)
    }
    else{
      console.error('Connect.listPhoneNumbersV2: ', error);
      throw error
    }

  }
  return connectResult;

}

const listPhoneNumbers = async (listPhoneNumberParams, retryCount=0) => {
  //const Connect = new ConnectClient();

  let connectResult
  try {
    connectResult = await Connect.listPhoneNumbersV2(listPhoneNumberParams).promise()
  }
  catch (error) {
    if (error.statusCode === 429 && retryCount <= 3) {
      console.error(`Connect.listPhoneNumbersV2 Throttled, waiting and then retrying. Retry number: ${retryCount+1}, Error: ${error}`);
      await wait(500*(retryCount+1));
      connectResult = await listPhoneNumbers(listPhoneNumberParams, retryCount++)
    }
    else{
      console.error('Connect.listPhoneNumbersV2: ', error);
      throw error
      //throw new ErrorHandler(error.statusCode, error.message);
    }

  }

  return connectResult;
}


const customBackoff = (retryCount) => {
  const timeToWait = 2 ** (retryCount+1) * 1000;
  const jitter = Math.floor(Math.random() * (1000 - 100 + 1) + 100)
  const waitWithJitter = timeToWait + jitter
  console.log(`retry count: ${retryCount}, timeToWait: ${timeToWait}, jitter: ${jitter} waiting: ${waitWithJitter}ms`)
  return waitWithJitter
}

const listPhoneNumbersDave = async (arn, index) => {
  const Connect = new ConnectClient({
    maxRetries: 3,
    retryDelayOptions: { customBackoff },
    region: 'us-east-1'
  });

  const params = {
    MaxResults: 1000,
    TargetArn: arn
  }

  const connectResult = await Connect.listPhoneNumbersV2(params).promise().catch(error => {
    console.error('Connect.listPhoneNumbersV2: ', error);
    //throw new ErrorHandler(500, 'Connect.listPhoneNumbersV2 error.');
  });
  //console.log('Numbers for ARN', arn);
  //console.log(connectResult.ListPhoneNumbersSummaryList);
  console.log(index, connectResult.ListPhoneNumbersSummaryList.length)
}

// for (let index = 0; index < 50; index++) {
//   listPhoneNumbers('arn:aws:connect:us-east-1:185413295518:instance/976e1e84-30e9-4177-b147-df4c1736e28a', index) //instance
// }


const callPN = async (v) => {
  console.log('running')
  let output;
  for (let i = 0; i < 50; i++) {
    output = await listPhoneNumbersDave("arn:aws:connect:us-east-1:185413295518:instance/976e1e84-30e9-4177-b147-df4c1736e28a", v);
    console.log('call:', i)
  }

}


const params = {
  "MaxResults": 1000,
  "TargetArn": "arn:aws:connect:us-east-1:185413295518:instance/976e1e84-30e9-4177-b147-df4c1736e28a"
}

callPN(1)
callPN(2)
callPN(3)
callPN(4)