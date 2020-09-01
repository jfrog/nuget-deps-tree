import { Extractor } from '../Extractor';
import { DependenciesTree } from '../DependenciesTree/Tree';
import { DependenciesUtils } from '../DependenciesTree/Utils';
import * as log from 'log4js';
import { PackagesExtractor } from '../PackagesConfig/Extractor';
import { AssetsExtractor } from '../AssetsJson/Extractor';

const logger = log.getLogger();

export class ProjectBuilder {
    constructor(
        private _name: string,
        private _rootPath: string,
        private _dependenciesSource: string,
        private _extractor: Extractor
    ) {}

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
    }

    public get rootPath(): string {
        return this._rootPath;
    }

    public set rootPath(value: string) {
        this._rootPath = value;
    }

    public get dependenciesSource(): string {
        return this._dependenciesSource;
    }

    public set dependenciesSource(value: string) {
        this._dependenciesSource = value;
    }

    public get extractor(): Extractor {
        return this._extractor;
    }

    public set extractor(value: Extractor) {
        this._extractor = value;
    }

    public static load(name: string, rootPath: string, dependenciesSource: string): ProjectBuilder {
        const ex: Extractor = ProjectBuilder.getCompatibleExtractor(name, dependenciesSource);
        return new ProjectBuilder(name, rootPath, dependenciesSource, ex);
    }

    public createDependencyTree(): DependenciesTree[] {
        return DependenciesUtils.createDependencyTree(this._extractor);
    }

    // Find suitable registered dependencies extractor.
    public static getCompatibleExtractor(projectName: string, dependenciesSource: string): Extractor {
        if (PackagesExtractor.isCompatible(projectName, dependenciesSource)) {
            return PackagesExtractor.newExtractor(dependenciesSource);
        }
        if (AssetsExtractor.isCompatible(projectName, dependenciesSource)) {
            return AssetsExtractor.newExtractor(dependenciesSource);
        }
        logger.debug('Unsupported project dependencies for project: %s', projectName);
        return null as any;
    }
}
