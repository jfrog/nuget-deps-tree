import { Extractor } from '../Extractor';
import { DependencyInt } from '../DependencyInt';
import { DependenciesTree } from './Tree';

type Root = DependenciesTree[];
export const absentNupkgWarnMsg: string =
    ' Skipping adding this dependency to the build info. This might be because the package already exists in a different NuGet cache,' +
    " possibly the SDK's NuGetFallbackFolder cache. Removing the package from this cache may resolve the issue.";

export class DependenciesUtils {
    /**
     * Create dependency tree using the data received from the extractors.
     */
    public static createDependencyTree(extractor: Extractor): Root {
        const rootTree: Root = [];
        const rootDependencies: string[] = extractor.directDependencies();
        const allDependencies: Map<string, DependencyInt> = extractor.allDependencies();
        const childrenMap: Map<string, string[]> = extractor.childrenMap();

        for (const root of rootDependencies) {
            const dependency: DependencyInt | undefined = allDependencies.get(root);
            if (dependency) {
                rootTree.push(new DependenciesTree(dependency, root, allDependencies, childrenMap));
            }
        }
        return rootTree;
    }
}
