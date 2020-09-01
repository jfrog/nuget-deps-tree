import { Dependency } from '../Structure/Dependency';
import { absentNupkgWarnMsg } from '../DependenciesTree/Utils';
import * as pathUtils from 'path';
import * as fse from 'fs-extra';
import * as log from 'log4js';

const logger = log.getLogger();

export class AssetsUtils {
    public static getDirectDependencies(assets: any): string[] {
        const directDependencies: string[] = [];
        const frameworks = assets.project.frameworks;
        for (const framework in frameworks) {
            for (const dependencyName in frameworks[framework].dependencies) {
                directDependencies.push(dependencyName.toLowerCase());
            }
        }
        return directDependencies;
    }

    public static getAllDependencies(assets: any): Map<string, Dependency> {
        const dependencies: Map<string, Dependency> = new Map();
        const packagesPath: string = assets.project.restore.packagesPath;
        const libraries = assets.libraries;

        for (const dependencyId in libraries) {
            const library = libraries[dependencyId];
            if (library.type === 'project') {
                continue;
            }
            const nupkgFileName: string = this.getNupkgFileName(library);
            const nupkgFilePath: string = pathUtils.join(packagesPath, library.path, nupkgFileName);
            if (!fse.pathExistsSync(nupkgFilePath)) {
                if (this.isPackagePartOfTargetDependencies(assets, library.path)) {
                    logger.warn(
                        'The file',
                        nupkgFilePath,
                        "doesn't exist in the NuGet cache directory but it does exist as a target in the assets files." +
                            absentNupkgWarnMsg
                    );
                    continue;
                }
                throw new Error('The file ' + nupkgFilePath + " doesn't exist in the NuGet cache directory.");
            }
            const dependencyName: string = this.getDependencyName(dependencyId);
            dependencies.set(dependencyName, new Dependency(this.getFormattedDependencyId(dependencyId)));
        }
        return dependencies;
    }

    public static getChildrenMap(assets: any): Map<string, string[]> {
        const dependenciesRelations: Map<string, string[]> = new Map();
        const targets = assets.targets;
        for (const target in targets) {
            const targetDependencies = targets[target];
            for (const dependencyId in targetDependencies) {
                const transitive: string[] = [];
                for (const transitiveName in targetDependencies[dependencyId].dependencies) {
                    transitive.push(transitiveName.toLowerCase());
                }
                dependenciesRelations.set(this.getDependencyName(dependencyId), transitive);
            }
        }
        return dependenciesRelations;
    }

    public static getDependencyName(dependencyId: string): string {
        return dependencyId.substring(0, dependencyId.indexOf('/')).toLowerCase();
    }

    // Dependencies-id in assets is built in form of: <package-name>/<version>.
    // The Build-info format of dependency id is: <package-name>:<version>.
    public static getFormattedDependencyId(dependencyAssetId: string): string {
        return dependencyAssetId.replace('/', ':');
    }

    // If the package is included in the targets section of the assets.json file,
    // then this is a .NET dependency that shouldn't be included in the dependencies list
    // (it come with the SDK).
    // Those files are located in the following path: C:\Program Files\dotnet\sdk\NuGetFallbackFolder
    public static isPackagePartOfTargetDependencies(assets: any, nugetPackageName: string): boolean {
        for (const target in assets.targets) {
            for (const dependencyId in assets.targets[target]) {
                // The package names in the targets section of the assets.json file are
                // case insensitive.
                if (dependencyId.localeCompare(nugetPackageName, undefined, { sensitivity: 'accent' }) === 0) {
                    return true;
                }
            }
        }
        return false;
    }

    public static getNupkgFileName(library: any): string {
        for (const fileName of library.files) {
            if (fileName.endsWith('nupkg.sha512')) {
                return pathUtils.parse(fileName).name;
            }
        }
        throw new Error('Could not find nupkg file name for: ' + library.path);
    }
}
