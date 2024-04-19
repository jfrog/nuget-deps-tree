#! /usr/bin/env node
import { NugetDepsTree } from '../src';

const args = process.argv.slice(2);
if (args.length !== 1) {
    throw new Error("Wrong number of arguments. Command accepts only one argument, which is a path to a solution file.")
}

if (["-h", "-help", "help"].includes(args[0])) {
    console.info("nuget-deps-tree - Nuget Dependency Tree Generator.\nUsage: nuget-deps-tree [path to sln file]")
    process.exit(0)
}

const depsTree: any = NugetDepsTree.generate(args[0])

function print(tree: DependencyTree, level: number = 0) {
    const prefix = "  ".repeat(level)
    console.info(`${prefix}${tree.id}@${tree.version}`)
    tree.dependencies.forEach((dep: any) => print(dep, level + 1))
}

function printProject(project: Project) {
    console.info(project.name)
    project.dependencies.forEach((dep: any) => print(dep, 1))
}

depsTree.projects.forEach((project: Project) => printProject(project))

// console.info(JSON.stringify(depsTree, null, 2))