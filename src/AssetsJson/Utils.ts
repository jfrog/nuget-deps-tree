import { absentNupkgWarnMsg } from '../DependencyTree/Utils';
import * as pathUtils from 'path';
import * as fse from 'fs-extra';
import * as log from 'log4js';
import { CommonUtils } from '../CommonUtils';
import { assetsFileName } from './Extractor';
import { DependencyDetails, CaseInsensitiveMap } from '../../model';
import { Dependency } from '../Structure/Dependency';

const logger = log.getLogger();

export class AssetsUtils {
    /**
     * Get array of all the root dependencies of the project.
     * @returns array of the ids' of all root dependencies
     */
    public static getDirectDependencies(assets: any): string[] {
        const directDependencies: string[] = [];
        const frameworks = CommonUtils.getPropertyOrUndefined(assets, 'project.frameworks');
        for (const framework in frameworks) {
            for (const dependencyId in CommonUtils.getPropertyOrUndefined(frameworks[framework], 'dependencies')) {
                directDependencies.push(dependencyId);
            }
        }
        return directDependencies;
    }

    /**
     * Get map of all the dependencies of the project.
     * @param assets - object representing the assets json file
     * @returns map of lower cased dependencies IDs and their actual details.
     */
    public static getAllDependencies(assets: any): CaseInsensitiveMap<DependencyDetails> {
        const dependencies: CaseInsensitiveMap<DependencyDetails> = new CaseInsensitiveMap<DependencyDetails>();
        // In case running on Unix, and the project was built on Windows, or vice versa.
        const packagesPath: string = CommonUtils.fixSeparatorsToMatchOs(
            CommonUtils.getPropertyStrictly(assets, 'project.restore.packagesPath', assetsFileName)
        );

        const libraries = CommonUtils.getPropertyOrUndefined(assets, 'libraries');
        for (const dependency in libraries) {
            const library = libraries[dependency];
            const type = CommonUtils.getPropertyStrictly(library, 'type', assetsFileName);
            if (type === 'project') {
                continue;
            }

            const libraryPath: string = CommonUtils.getPropertyStrictly(library, 'path', assetsFileName);
            const nupkgFileName: string = this.getNupkgFileName(library, libraryPath);
            const nupkgFilePath: string = pathUtils.join(
                packagesPath,
                CommonUtils.fixSeparatorsToMatchOs(libraryPath),
                nupkgFileName
            );
            // A package is a dependency if a nuget package file exists in Nuget cache directory.
            if (!fse.pathExistsSync(nupkgFilePath)) {
                if (this.isPackagePartOfTargetDependencies(assets, libraryPath)) {
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
            const splitDependency: string[] = this.getDependencyIdAndVersion(dependency);
            dependencies.set(splitDependency[0], new Dependency(splitDependency[0], splitDependency[1]));
        }
        return dependencies;
    }

    /**
     * Get map of the dependencies relations map.
     * @returns dependencies ids' and an array of their dependencies ids'
     */
    public static getChildrenMap(assets: any): CaseInsensitiveMap<string[]> {
        const dependenciesRelations: CaseInsensitiveMap<string[]> = new CaseInsensitiveMap<string[]>();
        // If has no target dependencies, loop is skipped.
        const targets = CommonUtils.getPropertyOrUndefined(assets, 'targets');
        for (const target in targets) {
            const targetDependencies = targets[target];
            for (const dependency in targetDependencies) {
                const transitive: string[] = [];
                // If has no dependencies, loop is skipped.
                for (const transitiveName in CommonUtils.getPropertyOrUndefined(
                    targetDependencies[dependency],
                    'dependencies'
                )) {
                    transitive.push(transitiveName);
                }
                const splitDependency: string[] = this.getDependencyIdAndVersion(dependency);
                dependenciesRelations.set(splitDependency[0], transitive);
            }
        }
        return dependenciesRelations;
    }

    /**
     * Parses a dependency for it's id and version.
     * @param dependency.
     * @returns id and version as array.
     */
    public static getDependencyIdAndVersion(dependency: string): string[] {
        const splitDependency: string[] = dependency.split('/');
        if (splitDependency.length !== 2) {
            throw Error('Unexpected dependency: ' + dependency + '. Could not parse id and version');
        }
        return splitDependency;
    }

    /**
     * If the package is included in the targets section of the assets.json file,
     * then this is a .NET dependency that shouldn't be included in the dependencies list (it come with the SDK).
     * Those files are located in the NuGetFallbackFolder directory.
     * @param assets - assets json object.
     * @param nugetPackageName - name of the package.
     * @returns true if part of targets.
     */
    public static isPackagePartOfTargetDependencies(assets: any, nugetPackageName: string): boolean {
        const targets: any = CommonUtils.getPropertyOrUndefined(assets, 'targets');
        for (const target in targets) {
            for (const dependency in targets[target]) {
                // The package names in the targets section of the assets.json file are case insensitive.
                if (dependency.localeCompare(nugetPackageName, undefined, { sensitivity: 'accent' }) === 0) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get the nuget package file of a dependency.
     * @param library - library object of a dependency in assets json.
     * @param libraryPath.
     * @returns file name.
     */
    public static getNupkgFileName(library: any, libraryPath: string): string {
        const files: any | undefined = CommonUtils.getPropertyOrUndefined(library, 'files');
        if (files) {
            for (const fileName of files) {
                if (fileName.endsWith('nupkg.sha512')) {
                    return pathUtils.parse(fileName).name;
                }
            }
        }
        throw new Error('Could not find nupkg file name for: ' + libraryPath);
    }
}
