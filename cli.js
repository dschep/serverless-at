#!/usr/bin/env node

const path = require('path')
const args = require('minimist')(process.argv.slice(2))
const { Context } = require('@serverless/core')
const Component = require('./serverless.js')

const runComponents = async () => {
  const [file, at] = args._

  const config = {
    root: process.cwd(),
    stateRoot: path.join(process.cwd(), '.serverless-at'),
    debug: args.debug,
    entity: Component.constructor.name
  }
  const context = new Context(config)

  if (!file || !at) {
    // eslint-disable-next-line no-console
    console.error('You must provide positional argument for file and at')
    context.close('error', new Error('You must provide positional argument for file and at'))
    process.exit(1)
  }

  try {
    process.stdout.write(`Deploying ${file} to run at ${at}...`)
    const component = new Component(undefined, context)
    await component.init()

    const outputs = await component({ file, at })

    process.stdout.write(`\rDeploying ${file} to run at ${at}...Done\n`)
    if (args.debug) console.debug(outputs)
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

if (require.main === module) {
  runComponents()
}
