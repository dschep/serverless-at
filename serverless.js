const path = require('path')
const types = require('./serverless.types.js')
const { Component, utils } = require('@serverless/core')
const AWS = require('aws-sdk')

/**
 * Parse Rate
 * - Takes a simple string and parses it as a standard cron expression
 */

const parseRate = (rate = '1m') => {
  const unit = rate.substr(rate.length - 1)
  if (['m', 'h', 'd'].includes(unit)) {
    let awsUnit
    const period = rate.substr(0, rate.length - 1)
    if (period === '1') {
      if (unit === 'm') {
        awsUnit = 'minute'
      }
      if (unit === 'h') {
        awsUnit = 'hour'
      }
      if (unit === 'd') {
        awsUnit = 'day'
      }
    } else {
      if (unit === 'm') {
        awsUnit = 'minutes'
      }
      if (unit === 'h') {
        awsUnit = 'hours'
      }
      if (unit === 'd') {
        awsUnit = 'days'
      }
    }
    return `rate(${period} ${awsUnit})`
  }
  return `cron(${rate})`
}

/**
 * Schedule
 */

class Schedule extends Component {

  /**
   * Types
   */

  types() { return types }

  /**
   * Default
   */

  async default(inputs = {}) {

    this.context.status('Deploying')

    if (!inputs.code) throw new Error('"code" is a required input')

    inputs.handler = inputs.handler || 'schedule.handler'
    inputs.parsedRate = parseRate(inputs.rate || '1h')
    inputs.enabled = inputs.enabled || true
    inputs.region = inputs.region || 'us-east-1'
    inputs.timeout = inputs.timeout || 7
    inputs.memory = inputs.memory || 512
    inputs.code = inputs.code
    inputs.env = inputs.env || {}

    this.state.cwName = this.state.cwName || 'scheduled-task-' + this.context.resourceId()
    await this.save()

    this.context.status('Deploying AWS Lambda')
    const awsLambda = await this.load('@serverless/aws-lambda')
    const lambdaOutputs = await awsLambda(inputs)

    const cloudWatchEvents = new AWS.CloudWatchEvents({
      region: inputs.region,
      credentials: this.context.credentials.aws
    })
    const putRuleParams = {
      Name: this.state.cwName,
      ScheduleExpression: inputs.parsedRate,
      State: inputs.enabled ? 'ENABLED' : 'DISABLED'
    }
    await cloudWatchEvents.putRule(putRuleParams).promise()

    const putTargetsParams = {
      Rule: this.state.cwName,
      Targets: [
        {
          Arn: lambdaOutputs.arn,
          Id: this.state.cwName
        }
      ]
    }
    await cloudWatchEvents.putTargets(putTargetsParams).promise()

    const lambda = new AWS.Lambda({
      region: inputs.region,
      credentials: this.context.credentials.aws
    })
    const addPermissionParams = {
      Action: 'lambda:InvokeFunction',
      FunctionName: lambdaOutputs.name,
      StatementId: this.state.cwName,
      Principal: 'events.amazonaws.com'
    }
    try {
      await lambda.addPermission(addPermissionParams).promise()
    } catch (e) {
      // if we are making an update, permissions are already added...
      if (e.code !== 'ResourceConflictException') {
        throw e
      }
    }

    this.state.region = inputs.region
    await this.save()

    const outputs = { ...lambdaOutputs, rate: inputs.rate || '1m', enabled: inputs.enabled }

    this.context.log()
    this.context.output('rate', `   ${outputs.rate}`)
    this.context.output('enabled', `${outputs.enabled}`)

    return outputs
  }

  /**
   * Remove
   */

  async remove() {
    this.context.status('Removing')

    const cloudWatchEvents = new AWS.CloudWatchEvents({
      region: this.state.region,
      credentials: this.context.credentials.aws
    })

    const removeTargetsParams = {
      Rule: this.state.cwName,
      Ids: [this.state.cwName]
    }

    try {
      await cloudWatchEvents.removeTargets(removeTargetsParams).promise()
    } catch (error) {
      if (error.code !== 'ResourceNotFoundException') {
        throw error
      }
    }

    const deleteRuleParams = {
      Name: this.state.cwName
    }

    try {
      await cloudWatchEvents.deleteRule(deleteRuleParams).promise()
    } catch (error) {
      if (error.code !== 'InternalException') {
        throw error
      }
    }

    const awsLambda = await this.load('@serverless/aws-lambda')
    await awsLambda.remove()

    this.state = {}
    await this.save()
    return {}
  }
}

module.exports = Schedule
