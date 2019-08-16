# :zap::alarm_clock: Serverless `at`

Instantly schedule run onetime jobs on AWS Lambda using
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

Create a file (Python and NodeJS currently supported) containing a lambda handler called `task`.
Eg: `foo.py` containing:
```python
def task(event, context):
    print('huzzah')
```

### 3. Deploy

```console
$ sls-at foo.py 2019-08-16T12:00:00
```
