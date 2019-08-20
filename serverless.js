const types = require('./serverless.types.js')
const { Component } = require('@serverless/core')

/**
 * Schedule
 */

class Schedule extends Component {
  /**
   * Types
   */

  types() {
    return types
  }

  /**
   * Default
   */

  async default(inputs = {}) {
    this.context.status('Deploying')

    inputs.name = this.state.name || inputs.name || this.context.resourceId()
    inputs.region = inputs.region || 'us-east-1'
    inputs.timeout = inputs.timeout || 7

    const handlerBase = inputs.file.slice(0, inputs.file.lastIndexOf('.'))
    const handlerExt = inputs.file.slice(inputs.file.lastIndexOf('.') + 1)
    inputs.runtime = {
      py: 'python3.7',
      js: 'nodejs10.x'
      // TODO: more runtimes
    }[handlerExt]
    inputs.handler = `${handlerBase}.task`

    const date = new Date(inputs.at)
    const userCronttab = `${date.getMinutes() + date.getTimezoneOffset() % 60} ${date.getHours() + Math.floor(date.getTimezoneOffset()/60)} ${date.getDate()} ${date.getMonth() + 1} ? ${date.getFullYear()}`
    const cleanupDelay = Math.ceil(inputs.timeout / 60)
    const cleanupDate = new Date(date.getTime() + cleanupDelay * 60000)
    const cleanupCronttab = `${cleanupDate.getMinutes()} ${cleanupDate.getHours()} ${cleanupDate.getDate()} ${cleanupDate.getMonth() +
      1} ? ${cleanupDate.getFullYear()}`

    const userSchedule = await this.load('@serverless/schedule', 'UserSchedule')
    const cleanupSchedule = await this.load('@serverless/schedule', 'CleanupSchedule')

    this.context.status('Deploying your AWS Lambda')
    const scheduleInputs = {}
    scheduleInputs.name = `${inputs.name}-user`
    scheduleInputs.rate = userCronttab
    scheduleInputs.handler = inputs.handler
    scheduleInputs.runtime = inputs.runtime
    scheduleInputs.region = inputs.region
    scheduleInputs.timeout = inputs.timeout
    scheduleInputs.memory = inputs.memory || 512
    scheduleInputs.code = { src: '.' }
    scheduleInputs.env = inputs.env || {}
    scheduleInputs.description = 'A function for the At Component.'
    const scheduleOutputs = await userSchedule(scheduleInputs)

    this.context.status('Deploying cleanup AWS Lambda')
    const cleanupScheduleInputs = {}
    cleanupScheduleInputs.name = `${inputs.name}-cleanup`
    cleanupScheduleInputs.rate = cleanupCronttab
    cleanupScheduleInputs.region = inputs.region
    cleanupScheduleInputs.code = { src: 'cleanup', root: __dirname }
    cleanupScheduleInputs.env = {
      USER_LAMBDA_NAME: scheduleOutputs.name,
      USER_CW_NAME: `${inputs.name}-user`,
      CLEANUP_CW_NAME: `${inputs.name}-cleanup`
    }
    cleanupScheduleInputs.description = 'A cleanup function for the At Component.'
    const cleanupScheduleOutputs = await cleanupSchedule(cleanupScheduleInputs)

    this.state.name = inputs.name
    this.state.region = inputs.region
    await this.save()

    const outputs = {
      userFunctionName: scheduleOutputs.name,
      cleanupFunctionName: cleanupScheduleOutputs.name,
      userScheduleTime: `${date.toISOString()}`,
      cleanupScheduleTime: `${cleanupDate.toISOString()}`,
      userScheduleName: `${inputs.name}-user`,
      cleanupScheduleName: `${inputs.name}-cleanup`
    }

    return outputs
  }

  /**
   * Remove
   */

  async remove() {
    this.context.status('Removing')

    const userSchedule = await this.load('@serverless/schedule', 'UserSchedule')
    const cleanupSchedule = await this.load('@serverless/schedule', 'CleanupSchedule')

    await userSchedule.remove({ name: `${this.state.name}-user` })
    await cleanupSchedule.remove({ name: `${this.state.name}-cleanup` })

    this.state = {}
    await this.save()
    return {}
  }
}

module.exports = Schedule
