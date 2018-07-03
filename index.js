const shell = require("shelljs");

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.commands = {
      build: {
        usage: "A plugin used to build front end applications",
        lifecycleEvents: ["client"]
      }
    };

    this.hooks = {
      "before:build:client": this.beforeBuildClient.bind(this),
      "build:client": this.buildClient.bind(this),
      "after:build:client": this.afterBuildClient.bind(this)
    };
  }

  beforeBuildClient() {
    this.serverless.cli.log("Building the client");
    const environment = this.serverless.service.provider.environment;

    if (!environment) {
      return;
    }

    Object.keys(environment).forEach(variable => {
      this.serverless.cli.log(
        `Setting ${variable} to ${environment[variable]}`
      );
      process.env[variable] = environment[variable];
    });
  }

  buildClient() {
    return new Promise((resolve, reject) => {
      const result = shell.exec("yarn build");
      if (result.code !== 0) {
        return reject(new this.serverless.classes.Error(result.stderr));
      }
      resolve();
    });
  }

  afterBuildClient() {
    this.serverless.cli.log("Successfully built the client");
  }
}

module.exports = ServerlessPlugin;
