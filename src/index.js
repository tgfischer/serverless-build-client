const { spawn } = require("cross-spawn");

const constants = require("./constants");

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
            lifecycleEvents: ["build"],
            options: {
              packager: {
                usage: "The packager that will be used to build the client",
                shortcut: "p",
                default: "yarn"
              },
              command: {
                usage: "The command that will be used to build the client",
                shortcut: "c",
                default: "build"
              },
              cwd: {
                usage: "The directory that will be used to run the packager",
                shortcut: "d"
              }
            }
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
    const packagers = Object.keys(constants.packagers);
    if (!packagers.includes(this.options.packager)) {
      return reject(
        new this.serverless.classes.Error(
          `Invalid packager. Expected one of ${packagers}`
        )
      );
    }

    const buildOptions = {
      cwd: this.options.cwd
    };

    const build = spawn(
      constants.packagers[this.options.packager],
      this.options.command.split(" "),
      buildOptions
    );

    build.stdout.on("data", this._onStdout.bind(this));
    build.stderr.on("data", this._onStderr.bind(this));
    build.on("error", this._onError.bind(this));
    build.on("close", code => {
      if (code === 0) {
        return resolve();
      }

      return reject(this.error);
    });
  }

  _onStdout(data) {
    return this.serverless.cli.log(data.toString().trim());
  }

  _onStderr(data) {
    this.error = new this.serverless.classes.Error(data.toString().trim());
    return this.serverless.cli.log(data.toString().trim());
  }

  _onError(err) {
    this.error = new this.serverless.classes.Error(err);
  }
}

module.exports = ServerlessClientBuildPlugin;
