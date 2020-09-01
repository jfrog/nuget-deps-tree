import { DependencyInt } from '../DependencyInt';

export class DependenciesTree {
    constructor(
        private _dependency: DependencyInt,
        private _id: string,
        allDependencies: Map<string, DependencyInt>,
        childrenMap: Map<string, string[]>,
        private _directDependencies?: DependenciesTree[]
    ) {
        if (!this.directDependencies) {
            this.directDependencies = [];
        }
        this.addChildren(allDependencies, childrenMap);
    }

    public get dependency(): DependencyInt {
        return this._dependency;
    }

    public set dependency(value: DependencyInt) {
        this._dependency = value;
    }

    public get directDependencies(): DependenciesTree[] | undefined {
        return this._directDependencies;
    }

    public set directDependencies(value: DependenciesTree[] | undefined) {
        this._directDependencies = value;
    }

    public get id(): string {
        return this._id;
    }

    public set id(value: string) {
        this._id = value;
    }

    // Add children nodes for a dependency.
    public addChildren(allDependencies: Map<string, DependencyInt>, children: Map<string, string[]>) {
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
