import { Solution } from './Structure/Solution';
import { Tree, Project } from './Structure/OutputStructure';

export class NugetDepsTree {
    /**
     * Generates a dependencies tree for the provided solution.
     * @param slnFilePath
     * @returns object representation of the dependencies tree.
     */
    public static generate(slnFilePath: string): Tree {
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
