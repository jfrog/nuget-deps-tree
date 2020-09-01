# NuGet Dependencies Tree

This npm package reads the NuGet dependencies of a .NET project, and generates a dependencies tree object.
This package was developed by JFrog, and is used by the [JFrog VS-Code Extension](https://marketplace.visualstudio.com/items?itemName=JFrog.jfrog-vscode-extension), to generate the dependencies tree for projects using NuGet dependencies.
You may use this package for other purposes and applications as well.

## Getting started

Add nuget-deps-tree as a dependency to your package.json file:

```json
"dependencies": {
  "nuget-deps-tree": "^0.1.0"
}
```

## Usage
```ts
import { NugetDepsTree } from 'nuget-deps-tree';
let nugetList = NugetDepsTree.generate(pathToSlnFile);
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
