import { DependencyDetails, Extractor, CaseInsensitiveMap } from '../../model';
import { DependencyTree } from './Tree';
import * as log from 'log4js';

const logger = log.getLogger();

type Root = DependencyTree[];
export const absentNupkgWarnMsg: string =
    ' Skipping adding this dependency to the dependency tree. This might be because the package already exists in a different NuGet cache,' +
    " possibly the SDK's NuGetFallbackFolder cache. Removing the package from this cache may resolve the issue.";

export class DependenciesUtils {
    /**
     * Creates dependency tree using the data received from the extractors.
     * @param extractor
     * @returns project's dependency tree
     */
    public static createDependencyTree(extractor: Extractor): Root {
        const rootTree: Root = [];
        const rootDependencies: string[] = extractor.directDependencies();
        const allDependencies: CaseInsensitiveMap<DependencyDetails> = extractor.allDependencies();
        const childrenMap: CaseInsensitiveMap<string[]> = extractor.childrenMap();

        for (const rootId of rootDependencies) {
            const dependency: DependencyDetails | undefined = allDependencies.get(rootId);
            if (dependency) {
                rootTree.push(new DependencyTree(dependency._id, dependency._version, allDependencies, childrenMap));
            } else {
                logger.warn('unexpected dependency found in root dependencies array: %s', rootId);
            }
        }
        return rootTree;
    }
}
