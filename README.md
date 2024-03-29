# :zap::alarm_clock: Serverless `at`

Instantly schedule one-time jobs to run on AWS Lambda using
[Serverless Components](https://github.com/serverless/components). Inspired by the UNIX `at`
command.

1. [Install](#1-install)
2. [Create a script](#2-create-a-script)
3. [Deploy](#3-deploy)


### 1. Install

```console
$ npm install -g dschep/serverless-at
```

### 2. Create a script

Create a file (Python & NodeJS currently supported) containing
a lambda handler called `task`.
Eg: `foo.py` containing:
```python
def task(event, context):
    print('huzzah')
    return
```

or: `foo.js` containing:
```javascript
module.exports.task = async () => {
    console.log('huzzah')
    return
}
```

### 3. Deploy

```console
$ sls-at foo.py 2019-08-16T12:00:00
```

The 1st argument is your script containing a `task` lambda handler function,
the 2nd is an [EcmaScript date](http://www.ecma-international.org/ecma-262/5.1/#sec-15.9.1.15).
