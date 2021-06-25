[![Test](https://github.com/jfrog/nuget-deps-tree/actions/workflows/test.yml/badge.svg)](https://github.com/jfrog/nuget-deps-tree/actions/workflows/test.yml)

# NuGet Dependency Tree

This npm package reads the NuGet dependencies of a .NET project, and generates a dependency tree.
This package was developed by JFrog, and is used by the [JFrog VS-Code Extension](https://marketplace.visualstudio.com/items?itemName=JFrog.jfrog-vscode-extension) to generate the dependency tree for projects using NuGet dependencies.
You may use this package for other purposes and applications as well, either by running via command line or by importing to your project.

## Installation
`npm install -g nuget-deps-tree`

## Usage
### Command Line
`nuget-deps-tree [path to sln file]`

### Project Dependency
```ts
import { NugetDepsTree } from 'nuget-deps-tree';
let tree = NugetDepsTree.generate(pathToSlnFile);
```

## Tree Structure
```json
{
  "projects": [
    {
      "name": "First.Project",
      "dependencies": [
        {
          "id": "dependency.One",
          "version": "1.0.0",
          "dependencies": [
            {
              "id": "dependency.Child",
              "version": "4.0.0",
              "dependencies": []
            }
          ]
        },
        {
          "id": "dependency.Two",
          "version": "2.0.0",
          "dependencies": []
        }
      ]
    },
    {
      "name": "Second.Project",
      "dependencies": [
        {
          "id": "dependency.Three",
          "version": "3.0.0",
          "dependencies": []
        }
      ]
    }
  ]
}
```

## Building and Testing the Sources
To build the plugin sources, please follow these steps:
* Clone the code from git.
* Install and pack the nuget-deps-tree dependency locally, by running the following npm commands:
```
npm i && npm pack
```
If you'd like run the nuget-deps-tree tests, run the following command:
```
npm t
```

## Pull requests

We welcome pull requests from the community.

### Guidelines

-   If the existing tests do not already cover your changes, please add tests.
-   Please run `npm run format` for formatting the code before submitting the pull request.
