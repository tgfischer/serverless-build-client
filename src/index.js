const { spawn } = require("child_process");

class ServerlessClientBuildPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.commands = {
      client: {
        usage: "A plugin used to build front end applications",
        lifecycleEvents: ["build"],
        commands: {
          build: {
            usage: "Build the client",
            lifecycleEvents: ["build"]
          }
        }
      }
    };

    this.hooks = {
      "before:client:build:build": this.beforeClientBuild.bind(this),
      "client:build:build": this.clientBuild.bind(this),
      "after:client:build:build": this.afterClientBuild.bind(this)
    };
  }

  beforeClientBuild() {
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

  clientBuild() {
    this.serverless.cli.log("Building the client");
    return new Promise(this._clientBuild.bind(this));
  }

  afterClientBuild() {
    this.serverless.cli.log("Successfully built the client");
  }

  _clientBuild(resolve, reject) {
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

module.exports = ServerlessClientBuildPlugin;
