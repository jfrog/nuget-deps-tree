import log from 'loglevel';
import { CaseInsensitiveMap, DependencyDetails, Extractor } from '../../model';
import { CommonUtils } from '../CommonUtils';
import { AssetsUtils } from './Utils';

export const assetsFileName: string = 'project.assets.json';

export class AssetsExtractor implements Extractor {
    constructor(private _assets: any) {}

    /**
     * Checks if the project's dependencies source is of assets type.
     * @param projectName - the project's name.
     * @param dependenciesSource - path to the project's dependencies source.
     * @returns true if compatible
     */
    public static isCompatible(projectName: string, dependenciesSource: string): boolean {
        if (dependenciesSource.endsWith(assetsFileName)) {
            log.debug('Found', dependenciesSource, 'file for project:', projectName);
            return true;
        }
        return false;
    }

    /**
     * Get map of all the dependencies of the project.
     * @returns map of lower cased dependencies IDs and their actual details.
     */
    public allDependencies(): CaseInsensitiveMap<DependencyDetails> {
        return AssetsUtils.getAllDependencies(this._assets);
    }

    /**
     * Get array of all the root dependencies of the project.
     * @returns array of the lower cased IDs of all root dependencies
     */
    public directDependencies(): string[] {
        return AssetsUtils.getDirectDependencies(this._assets);
    }

    /**
     * Get map of the dependencies relations map.
     * @returns map of lower cased dependencies IDs and an array of their lower cased dependencies IDs
     */
    public childrenMap(): CaseInsensitiveMap<string[]> {
        return AssetsUtils.getChildrenMap(this._assets);
    }

    /**
     * Create new assets json extractor.
     * @param dependenciesSource
     * @returns assets extractor
     */
    public static newExtractor(dependenciesSource: string): Extractor {
        const content: string | undefined = CommonUtils.readFileIfExists(dependenciesSource);
        if (!content) {
            throw new Error('Unable to read file: ' + dependenciesSource);
        }
        const assets: any = JSON.parse(content);
        return new AssetsExtractor(assets);
    }
}
