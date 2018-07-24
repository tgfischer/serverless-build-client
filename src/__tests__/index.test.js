const childProcess = require("cross-spawn");

const ServerlessClientBuildPlugin = require("../index");
const constants = require("../constants");

jest.mock("cross-spawn", () => ({
  spawn: jest.fn(() => ({
    stdout: {
      on: jest.fn()
    },
    stderr: {
      on: jest.fn()
    },
    on: jest.fn()
  }))
}));

describe("ServerlessClientBuildPlugin tests", () => {
  const env = process.env;
  const options = {
    packager: "yarn",
    command: "build"
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = JSON.parse(JSON.stringify(env));
  });

  it("should create the object", () => {
    const serverless = {
      cli: {
        log: jest.fn()
      }
    };
    const plugin = new ServerlessClientBuildPlugin(serverless, options);

    expect(plugin.serverless).toEqual(serverless);
    expect(plugin.options).toEqual(options);
    expect(plugin.commands).toEqual({
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
              }
            }
          }
        }
      }
    });
    expect(plugin.hooks).toEqual({
      "before:client:build:build": expect.any(Function),
      "client:build:build": expect.any(Function),
      "after:client:build:build": expect.any(Function)
    });
  });

  it("should log message after build is completed", () => {
    const serverless = {
      cli: {
        log: jest.fn()
      }
    };
    const plugin = new ServerlessClientBuildPlugin(serverless, options);
    plugin.afterClientBuild();

    expect(plugin.serverless.cli.log("Successfully built the client"));
  });

  describe("beforeClientBuild tests", () => {
    it("should skip processing environment variables", () => {
      const serverless = {
        cli: {
          log: jest.fn()
        },
        service: {
          provider: {}
        }
      };
      const plugin = new ServerlessClientBuildPlugin(serverless, options);
      plugin.beforeClientBuild();

      expect(plugin.serverless.cli.log).toHaveBeenCalledWith(
        "No environment variables detected. Skipping step..."
      );
      expect(process.env).toEqual(env);
    });

    it.each([
      ["should process empty list of environment variables", {}],
      [
        "should process on environment variable",
        {
          HELLO_WORLD: "hello world"
        }
      ],
      [
        "should process multiple environment variables",
        {
          HELLO_WORLD: "hello world",
          FOO_BAR: "foo bar"
        }
      ]
    ])("%s", (message, environment) => {
      const serverless = {
        cli: {
          log: jest.fn()
        },
        service: {
          provider: {
            environment
          }
        }
      };
      const plugin = new ServerlessClientBuildPlugin(serverless, options);
      plugin.beforeClientBuild();

      expect(plugin.serverless.cli.log.mock.calls).toEqual(
        [["Setting the environment variables"]].concat(
          Object.keys(environment).map(variable => [
            `Setting ${variable} to ${environment[variable]}`
          ])
        )
      );
      expect(process.env).toEqual(expect.objectContaining(environment));
    });
  });

  describe("clientBuild tests", () => {
    const resolve = jest.fn();
    const reject = jest.fn();
    const stdout = jest.fn((event, f) => f("some stdout"));
    const stderr = jest.fn((event, f) => f("some stderr"));
    const error = "error";
    const serverless = {
      cli: {
        log: jest.fn()
      },
      classes: {
        Error: jest.fn(err => new Error(err))
      }
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should start to build the client", () => {
      const plugin = new ServerlessClientBuildPlugin(serverless, options);
      plugin.clientBuild();

      expect(plugin.serverless.cli.log).toHaveBeenCalledWith(
        "Building the client"
      );
    });

    it("should throw if packager is invalid", () => {
      const on = jest.fn((event, f) => f(0));
      childProcess.spawn.mockImplementation(() => ({
        stdout: {
          on: stdout
        },
        stderr: {
          on: stderr
        },
        on
      }));

      const plugin = new ServerlessClientBuildPlugin(serverless, {
        packager: "hello",
        command: "build"
      });
      plugin._onStdout = jest.fn();
      plugin._onStderr = jest.fn();
      plugin._onError = jest.fn();
      plugin._clientBuild(resolve, reject);

      expect(childProcess.spawn).not.toHaveBeenCalled();
      expect(stdout).not.toHaveBeenCalled();
      expect(stderr).not.toHaveBeenCalled();
      expect(on).not.toHaveBeenCalled();
      expect(resolve).not.toHaveBeenCalled();
      expect(reject).toHaveBeenCalledWith(
        new Error(`Invalid packager. Expected one of ${constants.packagers}`)
      );
    });

    it.each([[constants.packagers[0]], [constants.packagers[1]]])(
      "should build with %s packager",
      packager => {
        const on = jest.fn((event, f) => f(0));
        childProcess.spawn.mockImplementation(() => ({
          stdout: {
            on: stdout
          },
          stderr: {
            on: stderr
          },
          on
        }));

        const plugin = new ServerlessClientBuildPlugin(serverless, {
          packager,
          command: "build"
        });
        plugin._onStdout = jest.fn();
        plugin._onStderr = jest.fn();
        plugin._onError = jest.fn();
        plugin._clientBuild(resolve, reject);

        expect(childProcess.spawn).toHaveBeenCalledWith(packager, ["build"]);
        expect(stdout).toHaveBeenCalledWith("data", expect.any(Function));
        expect(stderr).toHaveBeenCalledWith("data", expect.any(Function));
        expect(on.mock.calls).toEqual([
          ["error", expect.any(Function)],
          ["close", expect.any(Function)]
        ]);
        expect(resolve).toHaveBeenCalled();
        expect(reject).not.toHaveBeenCalled();
      }
    );

    it("should resolve with exist code 0", () => {
      const on = jest.fn((event, f) => f(0));
      childProcess.spawn.mockImplementation(() => ({
        stdout: {
          on: stdout
        },
        stderr: {
          on: stderr
        },
        on
      }));

      const plugin = new ServerlessClientBuildPlugin(serverless, options);
      plugin._onStdout = jest.fn();
      plugin._onStderr = jest.fn();
      plugin._onError = jest.fn();
      plugin._clientBuild(resolve, reject);

      expect(childProcess.spawn).toHaveBeenCalledWith("yarn", ["build"]);
      expect(stdout).toHaveBeenCalledWith("data", expect.any(Function));
      expect(stderr).toHaveBeenCalledWith("data", expect.any(Function));
      expect(on.mock.calls).toEqual([
        ["error", expect.any(Function)],
        ["close", expect.any(Function)]
      ]);
      expect(resolve).toHaveBeenCalled();
      expect(reject).not.toHaveBeenCalled();
    });

    it("should resolve with exist code 1", () => {
      const on = jest.fn((event, f) => f(1));
      childProcess.spawn.mockImplementation(() => ({
        stdout: {
          on: stdout
        },
        stderr: {
          on: stderr
        },
        on
      }));

      const plugin = new ServerlessClientBuildPlugin(serverless, options);
      plugin._onStdout = jest.fn();
      plugin._onStderr = jest.fn();
      plugin._onError = jest.fn();
      plugin._clientBuild(resolve, reject);

      expect(childProcess.spawn).toHaveBeenCalledWith("yarn", ["build"]);
      expect(stdout).toHaveBeenCalledWith("data", expect.any(Function));
      expect(stderr).toHaveBeenCalledWith("data", expect.any(Function));
      expect(on.mock.calls).toEqual([
        ["error", expect.any(Function)],
        ["close", expect.any(Function)]
      ]);
      expect(resolve).not.toHaveBeenCalled();
      expect(reject).toHaveBeenCalled();
    });

    it("should log the stdout", () => {
      const plugin = new ServerlessClientBuildPlugin(serverless, options);
      plugin._onStdout(new Buffer(" hello "));
      expect(serverless.cli.log).toHaveBeenCalledWith("hello");
    });

    it("should log the stderr", () => {
      const plugin = new ServerlessClientBuildPlugin(serverless, options);
      plugin._onStderr(new Buffer(` ${error} `));
      expect(plugin.error).toEqual(new Error(error));
      expect(serverless.cli.log).toHaveBeenCalledWith(error);
    });

    it("should set the error", () => {
      const plugin = new ServerlessClientBuildPlugin(serverless, options);
      plugin._onError(error);
      expect(plugin.error).toEqual(new Error(error));
    });
  });
});
