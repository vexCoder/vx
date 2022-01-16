module.exports = {  
  extensions: {
    ts: "module"
  },
  nodeArguments: [
    "--no-warnings",
    "--loader=ts-node/esm"
  ],
  files: [
    "test/*.test.*"
  ]
}