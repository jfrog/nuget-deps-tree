import { Dependency } from '../Structure/Dependency';
import { CommonUtils } from '../CommonUtils';
import { Extractor } from '../Extractor';
import { AssetsUtils } from './Utils';
import * as log from 'log4js';

const assetFileName: string = 'project.assets.json';
const logger = log.getLogger();

export class AssetsExtractor implements Extractor {
    constructor(private _assets: any) {}

    public static isCompatible(projectName: string, dependenciesSource: string): boolean {
        if (dependenciesSource.endsWith(assetFileName)) {
            logger.debug('Found', dependenciesSource, 'file for project:', projectName);
            return true;
        }
        return false;
    }

    public allDependencies(): Map<string, Dependency> {
        return AssetsUtils.getAllDependencies(this._assets);
    }

    public directDependencies(): string[] {
        return AssetsUtils.getDirectDependencies(this._assets);
    }

    public childrenMap(): Map<string, string[]> {
        return AssetsUtils.getChildrenMap(this._assets);
    }

    // Create new assets json extractor.
    public static newExtractor(dependenciesSource: string): Extractor {
        const content: string | undefined = CommonUtils.readFileIfExists(dependenciesSource);
        if (!content) {
            throw new Error('Unable to read file: ' + dependenciesSource);
        }
        const assets: any = JSON.parse(content);
        return new AssetsExtractor(assets);
    }
}
