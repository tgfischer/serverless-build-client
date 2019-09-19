module.exports.packagers = {
  yarn: "yarn",
  npm: "npm"
};

module.exports.defaults = {
  packager: "yarn",
  command: {
    yarn: "build",
    npm: "run build"
  }
};
