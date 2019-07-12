![serverless scheduled task aws lambda](https://s3.amazonaws.com/assets.github.serverless/readme-serverless-schedule.png)

# schedule

&nbsp;

Instantly run scheduled cron jobs on AWS Lambda using [Serverless Components](https://github.com/serverless/components).

&nbsp;

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)

&nbsp;


### 1. Install

```console
$ npm install -g @serverless/components
```

### 2. Create

```console
$ mkdir schedule && cd schedule
```

The directory should look something like this:


```
|- schedule.js
|- serverless.yml
|- package.json # optional
|- .env         # your development AWS api keys
|- .env.prod    # your production AWS api keys
```

the `.env` files are not required if you have the aws keys set globally and you want to use a single stage, but they should look like this.

```
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
```

The `schedule.js` file should contain your scheduling code.  It must export a module named `task`:

```js
module.exports.task = async (e, ctx, cb) => {
  console.log('running in schedule')
}
```

### 3. Configure

All the following inputs are optional. However, they allow you to configure your Lambda compute instance and pass environment variables.

```yml
# serverless.yml

name: schedule
stage: dev

mySchedule:
  component: "@serverless/schedule"
  inputs:
    code:
      src: ./code # The root folder containing the schedule.js file
      build: build # The folder within your 'src' directory containing your built artifacts
      hook: npm run build # A hook to build/test/do anything
    # you can provide a rate either as rate with
    # this format <amount><unit-character> (e.g. 1s, 5m, 2h)
    # or a cron expresion  
    rate: 5m
    enabled: true # this is the default value
    region: us-east-1
    memory: 128
    timeout: 10
    env:
      TABLE_NAME: my-table
```

### 4. Deploy

```console
schedule (master)$ components

  Schedule › outputs:
  name:  'schedule'
  description:  'My Schedule'
  memory:  128
  timeout:  10
  bucket:  undefined
  shims:  []
  handler:  'schedule.handler'
  runtime:  'nodejs8.10'
  env:
    TABLE_NAME:  'my-table'
  role:
    name:  'schedule'
    arn:  'arn:aws:iam::552760238299:role/schedule'
    service:  'lambda.amazonaws.com'
    policy:  { arn: 'arn:aws:iam::aws:policy/AdministratorAccess' }
  arn:  'arn:aws:lambda:us-east-1:552760238299:function:schedule'
  rate:  '5m'
  enabled:  true


  50s › dev › schedule › done

schedule (master)$
```

&nbsp;

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
