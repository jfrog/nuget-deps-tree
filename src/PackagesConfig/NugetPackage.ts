import * as lodash from 'lodash';
import log from 'loglevel';
import { CaseInsensitiveMap } from '../../model';
import { CommonUtils } from '../CommonUtils';

export class NugetPackage {
    private _dependencies: CaseInsensitiveMap<boolean> = new CaseInsensitiveMap<boolean>();

    constructor(private _id: string, private _version: string, nuspecContent: string) {
        this.fillDependenciesMap(nuspecContent);
    }

    public get dependencies(): CaseInsensitiveMap<boolean> {
        return this._dependencies;
    }
    public set dependencies(value: CaseInsensitiveMap<boolean>) {
        this._dependencies = value;
    }
    public get version(): string {
        return this._version;
    }
    public set version(value: string) {
        this._version = value;
    }
    public get id(): string {
        return this._id;
    }
    public set id(value: string) {
        this._id = value;
    }

    /**
     * Fills the dependencies map of this nuget package from metadata found in nuspec file.
     * @param nuspecContent - Content read from nuspec file.
     */
    public fillDependenciesMap(nuspecContent: string) {
        // Read metadata from nuspec file.
        let nuspec: any;
        try {
            nuspec = CommonUtils.parseXmlToObject(nuspecContent);
        } catch (error) {
            log.warn(
                "Package: %s couldn't be parsed due to: %s. Skipping the package dependency.",
                this._id + ':' + this._version,
                error
            );
            return;
        }

        // Get metadata dependencies if such exist. Check if fields exist before iterating over, but not strictly.
        const metaDataDep: any = lodash.get(nuspec, 'package[0].metadata[0].dependencies[0]');
        if (!metaDataDep) {
            return;
        }
        const depArray: any = lodash.get(metaDataDep, 'dependency');
        if (depArray) {
            for (const dependency of depArray) {
                this._dependencies?.set(dependency.id, true);
            }
        }

        // Dependencies might be grouped.
        const groupArray = lodash.get(metaDataDep, 'group');
        if (groupArray) {
            for (const group of groupArray) {
                if (group.dependency) {
                    for (const dependency of group.dependency) {
                        this._dependencies?.set(dependency.id, true);
                    }
                }
            }
        }
    }
}
