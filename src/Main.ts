import { Solution } from './Structure/Solution';
import { Tree, Project } from './OutputStructure';

export class NugetDepsTree {
    public static generate(slnFilePath: string): any {
        const sol: Solution = Solution.create(slnFilePath);

        const nugetDepsTree = new Tree([]);
        // Create the tree for each project.
        for (const proj of sol.projects) {
            const depsTree = proj.createDependencyTree();
            nugetDepsTree.projects.push(new Project(proj.name, depsTree));
        }

        return nugetDepsTree;
    }
}
