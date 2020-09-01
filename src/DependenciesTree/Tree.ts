import { DependencyInt } from '../DependencyInt';

export class DependenciesTree {
    private _directDependencies: DependenciesTree[] = [];

    constructor(
        private _dependency: DependencyInt,
        private _id: string,
        allDependencies: Map<string, DependencyInt>,
        childrenMap: Map<string, string[]>
    ) {
        this.addChildren(allDependencies, childrenMap);
    }

    public get dependency(): DependencyInt {
        return this._dependency;
    }

    public set dependency(value: DependencyInt) {
        this._dependency = value;
    }

    public get directDependencies(): DependenciesTree[] {
        return this._directDependencies;
    }

    public set directDependencies(value: DependenciesTree[]) {
        this._directDependencies = value;
    }

    public get id(): string {
        return this._id;
    }

    public set id(value: string) {
        this._id = value;
    }

    /**
     * Add children nodes for a dependency.
     * @param allDependencies - All dependencies, direct and transitive.
     * @param children - All dependencies pointing to their children.
     */
    private addChildren(allDependencies: Map<string, DependencyInt>, children: Map<string, string[]>) {
        const childArray: string[] | undefined = children.get(this._id);
        if (!childArray) {
            return;
        }
        for (const child of childArray) {
            const childDep: DependencyInt | undefined = allDependencies.get(child);
            if (childDep) {
                const childTree: DependenciesTree = new DependenciesTree(childDep, child, allDependencies, children);
                this._directDependencies?.push(childTree);
            }
        }
    }
}
