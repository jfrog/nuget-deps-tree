#! /usr/bin/env node
import { NugetDepsTree, Project, DependencyTree } from '../src';
const { program } = require('commander');

program
  .name('nuget-deps-tree')
  .description("Nuget Dependency Tree Generator.")
  .argument("<sln>", "solution file name")
  .option('--text', "print it in plain text format")

program.parse();

const options = program.opts();

const depsTree: any = NugetDepsTree.generate(program.args[0])

function print(tree: DependencyTree, level: number = 0) {
    const prefix = "  ".repeat(level)
    console.info(`${prefix}${tree.id}@${tree.version}`)
    tree.dependencies.forEach((dep: any) => print(dep, level + 1))
}

function printProject(project: Project) {
    console.info(project.name)
    project.dependencies.forEach((dep: any) => print(dep, 1))
}

if(options.text)
{
    depsTree.projects.forEach((project: Project) => printProject(project))
} else
{
    console.info(JSON.stringify(depsTree, null, 2))
}
