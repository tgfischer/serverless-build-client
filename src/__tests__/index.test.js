const ServerlessBuildClientPlugin = require("../index");
const childProcess = require("child_process");

jest.mock("child_process", () => ({
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

describe("ServerlessBuildClientPlugin tests", () => {
  const env = process.env;
  const options = {
    foo: "bar"
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
    const plugin = new ServerlessBuildClientPlugin(serverless, options);

    expect(plugin.serverless).toEqual(serverless);
    expect(plugin.options).toEqual(options);
    expect(plugin.commands).toEqual({
      build: {
        usage: "A plugin used to build front end applications",
        lifecycleEvents: ["client"]
      }
    });
    expect(plugin.hooks).toEqual({
      "before:build:client": expect.any(Function),
      "build:client": expect.any(Function),
      "after:build:client": expect.any(Function)
    });
  });

  it("should log message after build is completed", () => {
    const serverless = {
      cli: {
        log: jest.fn()
      }
    };
    const plugin = new ServerlessBuildClientPlugin(serverless, options);
    plugin.afterBuildClient();

    expect(plugin.serverless.cli.log("Successfully built the client"));
  });

  describe("beforeBuildClient tests", () => {
    it("should skip processing environment variables", () => {
      const serverless = {
        cli: {
          log: jest.fn()
        },
        service: {
          provider: {}
        }
      };
      const plugin = new ServerlessBuildClientPlugin(serverless, options);
      plugin.beforeBuildClient();

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
      const plugin = new ServerlessBuildClientPlugin(serverless, options);
      plugin.beforeBuildClient();

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

  describe("buildClient tests", () => {
    const resolve = jest.fn();
    const reject = jest.fn();
    const stdout = jest.fn((event, f) => f("some stdout"));
    const stderr = jest.fn((event, f) => f("some stderr"));
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
      const plugin = new ServerlessBuildClientPlugin(serverless, options);
      plugin.buildClient();

      expect(plugin.serverless.cli.log).toHaveBeenCalledWith(
        "Building the client"
      );
    });

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

      const plugin = new ServerlessBuildClientPlugin(serverless, options);
      plugin._buildClient(resolve, reject);

      expect(serverless.cli.log).toHaveBeenCalledWith("some stdout");
      expect(serverless.classes.Error).toHaveBeenCalledWith("some stderr");
      expect(childProcess.spawn).toHaveBeenCalledWith("yarn", ["build"]);
      expect(stdout).toHaveBeenCalledWith("data", expect.any(Function));
      expect(stderr).toHaveBeenCalledWith("data", expect.any(Function));
      expect(on).toHaveBeenCalledWith("close", expect.any(Function));
      expect(resolve).toHaveBeenCalled();
      expect(reject).not.toHaveBeenCalled();
    });

    it("should reject with exit code 1", () => {
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

      const plugin = new ServerlessBuildClientPlugin(serverless, options);
      plugin._buildClient(resolve, reject);

      expect(serverless.cli.log).toHaveBeenCalledWith("some stdout");
      expect(serverless.classes.Error).toHaveBeenCalledWith("some stderr");
      expect(childProcess.spawn).toHaveBeenCalledWith("yarn", ["build"]);
      expect(stdout).toHaveBeenCalledWith("data", expect.any(Function));
      expect(stderr).toHaveBeenCalledWith("data", expect.any(Function));
      expect(on).toHaveBeenCalledWith("close", expect.any(Function));
      expect(resolve).not.toHaveBeenCalled();
      expect(reject).toHaveBeenCalledWith(new Error("some stderr"));
    });
  });
});
