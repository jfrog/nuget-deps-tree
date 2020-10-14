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
console.info(JSON.stringify(depsTree, null, 2))
