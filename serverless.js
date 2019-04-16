const { Component } = require('@serverless/components')
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

class Cron extends Component {
  async default(inputs = {}) {
    this.cli.status('Deploying')
    const awsLambda = await this.load('@serverless/aws-lambda')

    inputs.name =
      inputs.name ||
      this.state.name ||
      `cron-${Math.random()
        .toString(36)
        .substring(6)}`
    inputs.handler = inputs.handler || 'cron.handler'
    inputs.parsedRate = parseRate(inputs.rate || '1m')
    inputs.enabled = inputs.enabled || true

    const lambdaOutput = await awsLambda(inputs)

    const lambda = new AWS.Lambda({
      region: 'us-east-1',
      credentials: this.context.credentials.aws
    })
    const cloudWatchEvents = new AWS.CloudWatchEvents({
      region: 'us-east-1',
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
      StatementId: `cron-${inputs.name}`,
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
    await this.save()

    const outputs = { ...lambdaOutput, rate: inputs.rate || '1m', enabled: inputs.enabled }

    this.cli.outputs(outputs)

    return outputs
  }

  async remove() {
    this.cli.status('Deploying')
    const awsLambda = await this.load('@serverless/aws-lambda')

    await awsLambda.remove()

    this.state = {}
    await this.save()
    return {}
  }
}

module.exports = Cron
