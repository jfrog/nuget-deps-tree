import { DependencyTree } from '../DependencyTree/Tree';

export class Tree {
    constructor(private _projects: Project[]) {}

    public get projects(): Project[] {
        return this._projects;
    }
    public set projects(value: Project[]) {
        this._projects = value;
    }

    // Remove underscore when converting to JSON.
    public toJSON() {
        return {
            projects: this._projects,
        };
    }
}

export class Project {
    constructor(private _name: string, private _dependencies: DependencyTree[]) {}

    public get name(): string {
        return this._name;
    }
    public set name(value: string) {
        this._name = value;
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
            name: this._name,
            dependencies: this._dependencies,
        };
    }
}
