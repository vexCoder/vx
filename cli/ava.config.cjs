module.exports = {  
  extensions: {
    ts: "module"
  },
  nodeArguments: [
    "--no-warnings",
    "--loader=ts-node/esm"
  ],
  files: [
    "test/**/*.test.*",
    // "!test/src/index.test.ts"
  ],
  require: [
    "./test/shim.ts"
  ]
}