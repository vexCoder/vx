# vx-cli

> Personal CLI helper for vex-turbo-boilerplate

## Install
----------

```bash
npm install -g vx
```
**or**
```bash
yarn global add vx
```

## Usage
----------
```bash
    Usage
    $ vx <command> [options]

    Commands
    generate  Generate a new app
    delete    Remove an app
    init      Initialize vex-turbo-boilerplate files

    Options
    --help, -h  Show help
    --version, -v  Show version
    --template, -t  Template to use
    --name, -n  Name of the app
    --type, -t  App type, this is based on the workspace, or vx paths settings
    --noconfirm, Disable confirmation


    Examples
    $ vx generate --template=react-app --name=my-app
```

### **Templates**
----------
- with-node-app
  - basic node application
- with-react-app
  - basic react application

### **Configuration**
----------
```json
// package.json
{
    "vx": {
        "workspaces": [
            "apps",
            "libs"
        ]
    }
}
// or
{
  "workspaces": [
      "apps/*",
      "libs/*"
  ]
}
```