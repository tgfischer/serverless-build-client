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
                shortcut: "p"
              },
              command: {
                usage: "The command that will be used to build the client",
                shortcut: "c"
              },
              cwd: {
                usage: "The directory that will be used to run the packager",
                shortcut: "d"
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
          provider: {},
          custom: {
            buildClient: {}
          }
        }
      };
      const plugin = new ServerlessClientBuildPlugin(serverless, options);
      plugin.beforeClientBuild();

      expect(plugin.serverless.cli.log).toHaveBeenCalledWith(
        "No environment variables detected. Skipping step..."
      );
      expect(process.env).toEqual(env);
    });

    it("should skip an empty list of environment variables", () => {
      const serverless = {
        cli: {
          log: jest.fn()
        },
        service: {
          provider: {
            environment: {}
          },
          custom: {
            buildClient: {
              environment: {}
            }
          }
        }
      };
      const plugin = new ServerlessClientBuildPlugin(serverless, options);
      plugin.beforeClientBuild();

      expect(plugin.serverless.cli.log).toHaveBeenCalledWith(
        "No environment variables detected. Skipping step..."
      );
      expect(process.env).toEqual(env);
    });

    const tests = [
      [
        "should process a provider environment variable",
        {
          HELLO_WORLD: "hello world"
        },
        {},
        {
          HELLO_WORLD: "hello world"
        }
      ],
      [
        "should process a custom environment variable",
        {},
        {
          HELLO_WORLD: "hello world"
        },
        {
          HELLO_WORLD: "hello world"
        }
      ],
      [
        "should process multiple environment variables",
        {
          HELLO_WORLD: "hello world"
        },
        {
          FOO_BAR: "foo bar"
        },
        {
          HELLO_WORLD: "hello world",
          FOO_BAR: "foo bar"
        }
      ],
      [
        "should override provider environment variables",
        {
          HELLO_WORLD: "hello world"
        },
        {
          HELLO_WORLD: "foo bar"
        },
        {
          HELLO_WORLD: "foo bar"
        }
      ]
    ];

    it.each(tests)(
      "%s",
      (message, providerEnvironment, customEnvironment, expectedResult) => {
        const serverless = {
          cli: {
            log: jest.fn()
          },
          service: {
            provider: {
              environment: providerEnvironment
            },
            custom: {
              buildClient: {
                environment: customEnvironment
              }
            }
          }
        };
        const plugin = new ServerlessClientBuildPlugin(serverless, options);
        plugin.beforeClientBuild();

        const environment = Object.assign(
          {},
          providerEnvironment,
          customEnvironment
        );

        expect(plugin.serverless.cli.log.mock.calls).toEqual(
          [["Setting the environment variables"]].concat(
            Object.keys(environment).map(variable => [
              `Setting ${variable} to ${environment[variable]}`
            ])
          )
        );
        expect(process.env).toEqual(expect.objectContaining(expectedResult));
      }
    );
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
        new Error(
          `Invalid packager hello. Expected one of ${Object.keys(
            constants.packagers
          )}`
        )
      );
    });

    it("should build with cwd option", () => {
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
        packager: "yarn",
        command: "build",
        cwd: "client"
      });
      plugin._onStdout = jest.fn();
      plugin._onStderr = jest.fn();
      plugin._onError = jest.fn();
      plugin._clientBuild(resolve, reject);

      expect(childProcess.spawn).toHaveBeenCalledWith("yarn", ["build"], {
        cwd: "client"
      });
      expect(stdout).toHaveBeenCalledWith("data", expect.any(Function));
      expect(stderr).toHaveBeenCalledWith("data", expect.any(Function));
      expect(on.mock.calls).toEqual([
        ["error", expect.any(Function)],
        ["close", expect.any(Function)]
      ]);
      expect(resolve).toHaveBeenCalled();
      expect(reject).not.toHaveBeenCalled();
    });

    it("should build with default packager and default command", () => {
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

      const plugin = new ServerlessClientBuildPlugin(serverless, {});
      plugin._onStdout = jest.fn();
      plugin._onStderr = jest.fn();
      plugin._onError = jest.fn();
      plugin._clientBuild(resolve, reject);

      expect(childProcess.spawn).toHaveBeenCalledWith("yarn", ["build"], {
        cwd: undefined
      });
      expect(stdout).toHaveBeenCalledWith("data", expect.any(Function));
      expect(stderr).toHaveBeenCalledWith("data", expect.any(Function));
      expect(on.mock.calls).toEqual([
        ["error", expect.any(Function)],
        ["close", expect.any(Function)]
      ]);
      expect(resolve).toHaveBeenCalled();
      expect(reject).not.toHaveBeenCalled();
    });

    it.each(Object.keys(constants.packagers))(
      "should build with %s packager and custom command",
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

        expect(childProcess.spawn).toHaveBeenCalledWith(
          constants.packagers[packager],
          ["build"],
          {
            cwd: undefined
          }
        );
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

    it.each(Object.keys(constants.packagers))(
      "should build with %s packager and default command",
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
          packager
        });
        plugin._onStdout = jest.fn();
        plugin._onStderr = jest.fn();
        plugin._onError = jest.fn();
        plugin._clientBuild(resolve, reject);

        expect(childProcess.spawn).toHaveBeenCalledWith(
          constants.packagers[packager],
          constants.defaults.command[packager].split(" "),
          { cwd: undefined }
        );
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

    it("should resolve with exit code 0", () => {
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

      expect(childProcess.spawn).toHaveBeenCalledWith("yarn", ["build"], {
        cwd: undefined
      });
      expect(stdout).toHaveBeenCalledWith("data", expect.any(Function));
      expect(stderr).toHaveBeenCalledWith("data", expect.any(Function));
      expect(on.mock.calls).toEqual([
        ["error", expect.any(Function)],
        ["close", expect.any(Function)]
      ]);
      expect(resolve).toHaveBeenCalled();
      expect(reject).not.toHaveBeenCalled();
    });

    it("should resolve with exit code 1", () => {
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

      expect(childProcess.spawn).toHaveBeenCalledWith("yarn", ["build"], {
        cwd: undefined
      });
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
