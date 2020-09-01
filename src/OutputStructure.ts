import { DependenciesTree } from './DependenciesTree/Tree';

export class Tree {
    constructor(private _projects: Project[]) {}

    public get projects(): Project[] {
        return this._projects;
    }
    public set projects(value: Project[]) {
        this._projects = value;
    }
}

export class Project {
    constructor(private _name: string, private _dependencies: DependenciesTree[]) {}

    public get name(): string {
        return this._name;
    }
    public set name(value: string) {
        this._name = value;
    }
    public get dependencies(): DependenciesTree[] {
        return this._dependencies;
    }
    public set dependencies(value: DependenciesTree[]) {
        this._dependencies = value;
    }
}
