# Serverless Build Client

[![npm](https://img.shields.io/npm/v/serverless-build-client.svg)](https://www.npmjs.com/package/serverless-build-client)
[![CircleCI](https://img.shields.io/circleci/project/github/tgfischer/serverless-build-client.svg)](https://circleci.com/gh/tgfischer/serverless-build-client)
[![GitHub license](https://img.shields.io/github/license/tgfischer/serverless-build-client.svg)](https://github.com/tgfischer/serverless-build-client/blob/master/LICENSE)
[![Coverage Status](https://coveralls.io/repos/github/tgfischer/serverless-build-client/badge.svg?branch=master)](https://coveralls.io/github/tgfischer/serverless-build-client?branch=master)

A Serverless Framework plugin for building the frontend with environment variables defined in `serverless.yml`

## Introduction

Plugins such as [`serverless-finch`](https://github.com/fernando-mc/serverless-finch) make it easy to host static websites in S3. These websites usually need to be built before being uploaded. Without this plugin, environment variables defined in `serverless.yml` will not be included in the build.

## Installation

First, install the package to your dev dependencies

```
yarn add --dev serverless-build-client
```

Then add the plugin to your `serverless.yml` file

```
...

plugins:
  - serverless-build-client

...
```

## Usage

In your command prompt, run the following command to build the client

```
serverless client build
```

This will add all of the environment variables in your `serverless.yml` file to `process.env`, and then it will execute `yarn build` to build the frontend

## Example

Let's say you have two separate Serverless Framework projects: one for the frontend, and one for the backend. When you deploy the backend service, a `ServiceEndpoint` is automatically outputted in the CloudFormation stack.

In order to avoid hardcoding this value, the frontend should reference an environment variable containing the endpoint. In your frontend's `serverless.yml` file, you would have something similar to

```
...

provider:
  ...
  environment:
    REACT_APP_BACKEND_ENDPOINT: ${cf:<backend service name>.ServiceEndpoint}

...
```

To deploy your front end, you need to run a series of commands (in this example, I am using [`serverless-finch`](https://github.com/fernando-mc/serverless-finch))

```
serverless deploy
serverless client build
serverless client deploy --no-confirm
```

These commands will first deploy your application to AWS. Then it will build the front end with the environment variable defined above. Then it will upload the built website to S3.
