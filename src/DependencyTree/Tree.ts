import log from 'loglevel';
import { CaseInsensitiveMap, DependencyDetails } from '../../model';

export class DependencyTree {
    private _dependencies: DependencyTree[] = [];

    constructor(
        private _id: string,
        private _version: string,
        allDependencies: CaseInsensitiveMap<DependencyDetails>,
        childrenMap: CaseInsensitiveMap<string[]>
    ) {
        this.addChildren(allDependencies, childrenMap);
    }

    public get id(): string {
        return this._id;
    }

    public set id(value: string) {
        this._id = value;
    }

    public get version(): string {
        return this._version;
    }
    public set version(value: string) {
        this._version = value;
    }

    public get dependencies(): DependencyTree[] {
        return this._dependencies;
    }

    public set dependencies(value: DependencyTree[]) {
        this._dependencies = value;
    }

    // Remove underscore when converting to JSON.
    public toJSON() {
        return {
            id: this._id,
            version: this._version,
            dependencies: this._dependencies,
        };
    }

    /**
     * Recursively add children nodes for a dependency.
     * @param allDependencies - All dependencies, direct and transitive.
     * @param children - All dependencies pointing to their children.
     */
    private addChildren(
        allDependencies: CaseInsensitiveMap<DependencyDetails>,
        children: CaseInsensitiveMap<string[]>
    ) {
        const childArray: string[] | undefined = children.get(this._id);
        if (!childArray) {
            return;
        }
        for (const childId of childArray) {
            const dependency: DependencyDetails | undefined = allDependencies.get(childId);
            if (dependency) {
                const childTree: DependencyTree = new DependencyTree(
                    dependency._id,
                    dependency._version,
                    allDependencies,
                    children
                );
                this._dependencies?.push(childTree);
            } else {
                log.warn('unexpected dependency found in children array: %s', childId);
            }
        }
    }
}
