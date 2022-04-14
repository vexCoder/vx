<div id="top"></div>

# vx-cli

> Personal CLI helper for vex-turbo-boilerplate

<br />


## Installation


```bash
npm install -g vx
```
**or**
```bash
yarn global add vx
```


<br/>

## Usage

```bash
Usage
  $ vx <command> [options]

Commands
  generate  Generate a new app
  delete    Remove an app
  init      Initialize vex-turbo-boilerplate files

Options

  --help  Show help
  --version  Show version
  --no-confirm, Disable confirmation
  --dir, Change the current working directory 

generate
  --template, -t  Template to use
  --name, -n  Name of the app

delete
  --name, -n  Name of the app

init
  --name, -n Monorepo project name 

Examples
  $ vx generate --template=react-app --name=my-app
  $ vx init --namte=monorepo-name
```

### **Adding Templates**
----------
To add more templates you must add templatesPaths in the vx field of your root package.json. templatesPaths field should contain all your templates directory.

Templates should have .vxignore so that it will be detected as a template. It should also have a package.json file.

### **Deleting Apps**
----------
To delete apps you need to create an empty `.unlock` file in the app directory


### **Templates**
----------
- with-node
  - basic node application
- with-vite-react
  - basic react application with vite

### **Configuration**
----------
```json
// package.json
{
    "vx": {
        "workspaces": [
            "apps",
            "libs"
        ],
        "templatesPaths": [
          "path/to/additional/templates_list_1",
          "path/to/additional/templates_list_2"
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


<br/>

## Roadmap

- [x] Generate App
  - [x] Template Types
  - [x] templatesPaths
- [x] Delete App
- [x] Initialize Base
  - [ ] Base Types
- [x] Operations use InkJS

<br/>

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<br/>