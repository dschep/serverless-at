/* eslint-disable no-console */
const AWS = require('aws-sdk')

const lambda = new AWS.Lambda()
const cloudWatchEvents = new AWS.CloudWatchEvents()

module.exports.task = async () => {
  const schedName = process.env.USER_CW_NAME
  const userSchedName = process.env.CLEANUP_CW_NAME
  const cleanupLambdaName = process.env.AWS_LAMBDA_FUNCTION_NAME
  const userLambdaName = process.env.USER_LAMBDA_NAME

  console.debug(`Deleting CloudWatch Event Target ${userSchedName}`)
  await cloudWatchEvents
    .removeTargets({
      Rule: userSchedName,
      Ids: [userSchedName]
    })
    .promise()

  console.debug(`Deleting CloudWatch Event Target ${schedName}`)
  await cloudWatchEvents
    .removeTargets({
      Rule: schedName,
      Ids: [schedName]
    })
    .promise()

  console.debug(`Deleting CloudWatch Event Rule ${userSchedName}`)
  await cloudWatchEvents.deleteRule({ Name: userSchedName }).promise()

  console.debug(`Deleting CloudWatch Event Rule ${schedName}`)
  await cloudWatchEvents.deleteRule({ Name: schedName }).promise()

  console.debug(`Deleting Lambda ${userLambdaName}`)
  await lambda.deleteFunction({ FunctionName: userLambdaName }).promise()

  console.debug(`Deleting Lambda ${cleanupLambdaName}`)
  await lambda.deleteFunction({ FunctionName: cleanupLambdaName }).promise()
}

/* eslint-enable no-console */
