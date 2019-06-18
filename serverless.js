const path = require('path')
const { Component, utils } = require('@serverless/core')
const AWS = require('aws-sdk')

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

class Schedule extends Component {
  async default(inputs = {}) {
    this.context.status('Deploying')
    const awsLambda = await this.load('@serverless/aws-lambda')

    inputs.name =
      this.state.name ||
      utils.generateResourceName(inputs.name || 'schedule', this.context.resourceGroupId)
    inputs.handler = inputs.handler || 'schedule.handler'
    inputs.parsedRate = parseRate(inputs.rate || '1m')
    inputs.enabled = inputs.enabled || true
    inputs.region = inputs.region || 'us-east-1'
    inputs.code = path.join(process.cwd(), 'test')

    const lambdaOutput = await awsLambda(inputs)

    const lambda = new AWS.Lambda({
      region: inputs.region,
      credentials: this.context.credentials.aws
    })
    const cloudWatchEvents = new AWS.CloudWatchEvents({
      region: inputs.region,
      credentials: this.context.credentials.aws
    })

    const putRuleParams = {
      Name: inputs.name,
      ScheduleExpression: inputs.parsedRate,
      State: inputs.enabled ? 'ENABLED' : 'DISABLED'
    }

    await cloudWatchEvents.putRule(putRuleParams).promise()

    const putTargetsParams = {
      Rule: inputs.name,
      Targets: [
        {
          Arn: lambdaOutput.arn,
          Id: inputs.name
        }
      ]
    }

    await cloudWatchEvents.putTargets(putTargetsParams).promise()

    const addPermissionParams = {
      Action: 'lambda:InvokeFunction',
      FunctionName: inputs.name,
      StatementId: `schedule-${inputs.name}`,
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

    this.state.name = inputs.name
    this.state.region = inputs.region
    await this.save()

    const outputs = { ...lambdaOutput, rate: inputs.rate || '1m', enabled: inputs.enabled }

    this.context.log()
    this.context.output('rate', `   ${outputs.rate}`)
    this.context.output('enabled', `${outputs.enabled}`)

    return outputs
  }

  async remove() {
    this.context.status('Removing')
    if (!this.state.name) {
      return
    }
    const cloudWatchEvents = new AWS.CloudWatchEvents({
      region: this.state.region,
      credentials: this.context.credentials.aws
    })

    const removeTargetsParams = {
      Rule: this.state.name,
      Ids: [this.state.name]
    }

    try {
      await cloudWatchEvents.removeTargets(removeTargetsParams).promise()
    } catch (error) {
      if (error.code !== 'ResourceNotFoundException') {
        throw error
      }
    }

    const deleteRuleParams = {
      Name: this.state.name
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
