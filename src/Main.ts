import { Solution } from './Structure/Solution';
import { Tree, Project } from './Structure/OutputStructure';
import { DependencyTree } from './DependencyTree/Tree';

export class NugetDepsTree {
    /**
     * Generates a dependencies tree for the provided solution.
     * @param slnFilePath
     * @returns object representation of the dependencies tree.
     */
    public static generate(slnFilePath: string): Tree {
        const sol: Solution = Solution.create(slnFilePath);

        const nugetDepsTree: Tree = new Tree([]);
        // Create the tree for each project.
        for (const proj of sol.projects) {
            const depsTree: DependencyTree[] = proj.createDependencyTree();
            nugetDepsTree.projects.push(new Project(proj.name, depsTree));
        }

        return nugetDepsTree;
    }
}
