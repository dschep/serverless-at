# Socket

&nbsp;

Instantly run scheduled cron jobs on AWS using [Serverless Components](https://github.com/serverless/components).

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
$ mkdir cron-job && cd cron-job
```

The directory should look something like this:


```
|- cron.js
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

The `cron.js` file contains your cron code.

```js
module.exports.handler = async (e, ctx, cb) => {
  console.log('running in schedule')
}
```

### 3. Configure

All the following inputs are optional. However, they allow you to configure your Lambda compute instance and pass environment variables.

```yml
# serverless.yml

name: cron-job
stage: dev

Cron:
  component: "@serverless/cron"
  inputs:
    name: cron-job
    
    # you can provide a rate either as rate with
    # this format <amount><unit-character> (e.g. 1s, 5m, 2h)
    # or a cron expresion  
    rate: 5m 
    enabled: true # this is the default value
    handler: cron.handler # this is the default value
    description: My Cron Job
    regoin: us-east-1
    memory: 128
    timeout: 10
    env:
      TABLE_NAME: my-table
    
    # the directory that contains the cron.js file.
    # If not provided, the default is the current working directory
    code: ./code


```

### 4. Deploy

```console
Socket (master)$ components

  Socket › outputs:
  url:  'wss://3v1fypmyz8.execute-api.us-east-1.amazonaws.com/dev/'
  code: 
    runtime:  'nodejs8.10'
    env:  []
    timeout:  10
    memory:  512
  routes:  [ '$connect', '$disconnect', '$default' ]


  36s › dev › Socket › done

Socket (master)$
```

&nbsp;

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
