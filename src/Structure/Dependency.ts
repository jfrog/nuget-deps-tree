import { DependencyDetails } from '../../model';

export class Dependency implements DependencyDetails {
    constructor(public _id: string, public _version: string) {}

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
}
