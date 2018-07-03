const { spawn } = require("child_process");

class ServerlessBuildClientPlugin {
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
    this.serverless.cli.log("Setting the environment variables");
    const environment = this.serverless.service.provider.environment;

    if (!environment) {
      return this.serverless.cli.log(
        "No environment variables detected. Skipping step..."
      );
    }

    Object.keys(environment).forEach(variable => {
      this.serverless.cli.log(
        `Setting ${variable} to ${environment[variable]}`
      );
      process.env[variable] = environment[variable];
    });
  }

  buildClient() {
    this.serverless.cli.log("Building the client");
    return new Promise(this._buildClient.bind(this));
  }

  afterBuildClient() {
    this.serverless.cli.log("Successfully built the client");
  }

  _buildClient(resolve, reject) {
    const build = spawn("yarn", ["build"]);
    let err;

    build.stdout.on("data", data =>
      this.serverless.cli.log(data.toString().trim())
    );
    build.stderr.on("data", data => {
      err = new this.serverless.classes.Error(data.toString().trim());
    });
    build.on("close", code => (code === 0 ? resolve() : reject(err)));
  }
}

module.exports = ServerlessBuildClientPlugin;
