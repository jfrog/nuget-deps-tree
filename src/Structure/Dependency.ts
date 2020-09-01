import { DependencyInt } from '../DependencyInt';

export class Dependency implements DependencyInt {
    constructor(public _id: string) {}

    public get id(): string {
        return this._id;
    }
    public set id(value: string) {
        this._id = value;
    }
}
