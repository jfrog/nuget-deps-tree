import { Dependency } from '../Structure/Dependency';
import { CommonUtils } from '../CommonUtils';
import { Extractor } from '../Extractor';
import * as exec from 'child_process';
import * as fse from 'fs-extra';
import * as pathUtils from 'path';
import * as parser from 'fast-xml-parser';
import { absentNupkgWarnMsg } from '../DependenciesTree/Utils';
import * as log from 'log4js';

const packagesFileName: string = 'packages.config';
const logger = log.getLogger();

export class PackagesExtractor implements Extractor {
    constructor(private _allDependencies: Map<string, Dependency>, private _childrenMap: Map<string, string[]>) {}

    public allDependencies(): Map<string, Dependency> {
        return this._allDependencies;
    }

    public directDependencies(): string[] {
        return this.getDirectDependencies(this._allDependencies, this._childrenMap);
    }

    public childrenMap(): Map<string, string[]> {
        return this._childrenMap;
    }

    public static isCompatible(projectName: string, dependenciesSource: string): boolean {
        if (dependenciesSource.endsWith(packagesFileName)) {
            logger.debug('Found', dependenciesSource, 'file for project:', projectName);
            return true;
        }
        return false;
    }

    // Create new packages.config extractor.
    public static newExtractor(dependenciesSource: string): Extractor {
        const newPkgExtractor: PackagesExtractor = new PackagesExtractor(
            new Map<string, Dependency>(),
            new Map<string, string[]>()
        );
        const packagesConfig: any = newPkgExtractor.loadPackagesConfig(dependenciesSource);
        const globalPackagesCache: string = newPkgExtractor.getGlobalPackagesCache();
        newPkgExtractor.extract(packagesConfig, globalPackagesCache);
        return newPkgExtractor;
    }

    public getDirectDependencies(
        allDependencies: Map<string, Dependency>,
        childrenMap: Map<string, string[]>
    ): string[] {
        const helper: Map<string, DfsHelper> = new Map();
        for (const id of allDependencies.keys()) {
            helper.set(id, new DfsHelper(false, false, false));
        }

        for (const id of allDependencies.keys()) {
            if (helper.get(id)?.visited) {
                continue;
            }
            this.searchRootDependencies(helper, id, allDependencies, childrenMap, new Map([[id, true]]));
        }

        const rootDependencies: string[] = [];
        helper.forEach((nodeData: DfsHelper, id: string) => {
            if (!nodeData.notRoot || nodeData.circular) {
                rootDependencies.push(id);
            }
        });

        return rootDependencies;
    }

    public searchRootDependencies(
        dfsHelper: Map<string, DfsHelper>,
        currentId: string,
        allDependencies: Map<string, Dependency>,
        childrenMap: Map<string, string[]>,
        traversePath: Map<string, boolean>
    ) {
        if (dfsHelper.get(currentId)?.visited) {
            return;
        }

        const children: string[] | undefined = childrenMap.get(currentId);
        if (children && children.length > 0) {
            for (const next of children) {
                if (!allDependencies.get(next)) {
                    // No such dependency.
                    continue;
                }
                if (traversePath.get(next)) {
                    for (const circular of traversePath.keys()) {
                        const circularDfs: DfsHelper = this.getDfs(dfsHelper, circular);
                        circularDfs.circular = true;
                    }
                    continue;
                }

                // Not root dependency.
                const noRootDfs: DfsHelper = this.getDfs(dfsHelper, next);
                noRootDfs.notRoot = true;
                traversePath.set(next, true);
                this.searchRootDependencies(dfsHelper, next, allDependencies, childrenMap, traversePath);
                traversePath.delete(next);
            }
        }
        const visitedDfs: DfsHelper = this.getDfs(dfsHelper, currentId);
        visitedDfs.visited = true;
        return;
    }

    public getDfs(dfsHelper: Map<string, DfsHelper>, key: string): DfsHelper {
        let dfs: DfsHelper | undefined = dfsHelper.get(key);
        if (!dfs) {
            dfs = new DfsHelper(false, false, false);
            dfsHelper.set(key, dfs);
        }
        return dfs;
    }

    public extract(packagesConfig: any, globalPackagesCache: string) {
        for (const nuget of packagesConfig.packages[0].package) {
            const id: string = nuget.id.toLowerCase();
            const nPackage: NugetPackage = new NugetPackage(id, nuget.version, new Map());

            // First lets check if the original version exists within the file system:
            let pack: NugetPackage | undefined = this.createNugetPackage(globalPackagesCache, nuget, nPackage);
            if (!pack) {
                // If doesn't exists lets build the array of alternative versions.
                const alternativeVersions: string[] = this.createAlternativeVersionForms(nuget.version);
                // Now lets do a loop to run over the alternative possibilities.
                for (let i: number = 0; i > alternativeVersions.length; i++) {
                    nPackage.version = alternativeVersions[i];
                    pack = this.createNugetPackage(globalPackagesCache, nuget, nPackage);
                    if (pack) {
                        break;
                    }
                }
            }

            if (pack && pack.dependency) {
                this._allDependencies.set(id, pack.dependency);
                this._childrenMap.set(id, Array.from(pack.dependencies.keys()));
            } else {
                logger.warn(
                    'The following NuGet package %s with version %s was not found in the NuGet cache %s.' +
                        absentNupkgWarnMsg,
                    nuget.id,
                    nuget.version,
                    globalPackagesCache
                );
            }
        }
    }

    public createNugetPackage(packagesPath: string, nuget: any, nPackage: NugetPackage): NugetPackage | undefined {
        const nupkgPath: string = pathUtils.join(
            packagesPath,
            nPackage.id,
            nPackage.version,
            [nPackage.id, nPackage.version, 'nupkg'].join('.')
        );

        if (!fse.pathExists(nupkgPath)) {
            return undefined;
        }

        nPackage.dependency = new Dependency(nuget.id + ':' + nuget.version);

        // Nuspec file that holds the metadata for the package.
        const nuspecPath: string = pathUtils.join(
            packagesPath,
            nPackage.id,
            nPackage.version,
            [nPackage.id, 'nuspec'].join('.')
        );
        const nuspecContent: string | undefined = CommonUtils.readFileIfExists(nuspecPath);
        if (!nuspecContent) {
            throw new Error('Unable to read file: ' + nuspecPath);
        }

        let nuspec: any;
        try {
            nuspec = parser.parse(nuspecContent, { ignoreAttributes: false, attributeNamePrefix: '', arrayMode: true });
        } catch (error) {
            logger.warn(
                "Package: %s couldn't be parsed due to: %s. Skipping the package dependency.",
                nPackage.id + ':' + nPackage.version,
                error
            );
            return nPackage;
        }

        // Get metadata dependencies if such exist. Check fields exist before iterating over.
        const metaDataDep: any = nuspec.package[0].metadata[0].dependencies;
        if (!metaDataDep) {
            return nPackage;
        }
        const depArray: any = metaDataDep[0].dependency;
        if (depArray) {
            for (const dependency of depArray) {
                nPackage.dependencies.set(dependency.id.toLowerCase(), true);
            }
        }

        // Dependencies might be grouped.
        const groupArray = metaDataDep[0].group;
        if (groupArray) {
            for (const group of groupArray) {
                if (group.dependency) {
                    for (const dependency of group.dependency) {
                        nPackage.dependencies.set(dependency.id.toLowerCase(), true);
                    }
                }
            }
        }

        return nPackage;
    }

    // NuGet allows the version will be with missing or unnecessary zeros
    // This method will return a list of the possible alternative versions
    // "1.0" --> []string{"1.0.0.0", "1.0.0", "1"}
    // "1" --> []string{"1.0.0.0", "1.0.0", "1.0"}
    // "1.2" --> []string{"1.2.0.0", "1.2.0"}
    // "1.22.33" --> []string{"1.22.33.0"}
    // "1.22.33.44" --> []string{}
    // "1.0.2" --> []string{"1.0.2.0"}
    public createAlternativeVersionForms(originalVersion: string): string[] {
        const versionsSlice: string[] = originalVersion.split('.');

        for (let i: number = 4; i > versionsSlice.length; i--) {
            versionsSlice.push('0');
        }

        const alternativeVersions: string[] = [];

        for (let i: number = 4; i > 0; i--) {
            const version: string = versionsSlice.slice(0, i).join('.');
            if (version !== originalVersion) {
                alternativeVersions.push(version);
            }
            if (!version.endsWith('.0')) {
                return alternativeVersions;
            }
        }
        return alternativeVersions;
    }

    public loadPackagesConfig(dependenciesSource: string): any {
        const content: string | undefined = CommonUtils.readFileIfExists(dependenciesSource);
        if (!content) {
            throw new Error('Unable to read file: ' + dependenciesSource);
        }
        return parser.parse(content, { ignoreAttributes: false, attributeNamePrefix: '', arrayMode: true });
    }

    public getGlobalPackagesCache(): string {
        const output: string = this.runGlobalPackagesCommand();
        const globalPackagesPath: string = this.removeGlobalPackagesPrefix(output);
        if (!fse.pathExists(globalPackagesPath)) {
            throw new Error('Could not find global packages path at: ' + globalPackagesPath);
        }
        return globalPackagesPath;
    }

    public removeGlobalPackagesPrefix(line: string): string {
        return line.replace(/^global-packages:/, '').trim();
    }

    public runGlobalPackagesCommand(): string {
        let cmd: string = this.getExecutablePath();
        cmd += ' locals global-packages -list';
        let output: string = '';
        try {
            output = exec.execSync(cmd, { maxBuffer: 10485760 }).toString();
        } catch (error) {
            throw new Error("Running '" + cmd + "' failed with error: " + error);
        }
        return output;
    }

    public getExecutablePath(): string {
        if (CommonUtils.isWindows()) {
            return CommonUtils.lookPath('nuget');
        }
        return this.getNonWindowsExecutablePath();
    }

    // NuGet can be run on non Windows OS in one of the following ways:
    //  1. using nuget client
    //  2. using Mono
    public getNonWindowsExecutablePath(): string {
        const nugetPath: string = CommonUtils.lookPath('nuget');
        if (nugetPath) {
            return nugetPath;
        }
        // If 'nuget' wasn't found, we Will try to run nuget using mono.
        // Mono's first argument is nuget.exe's path, so we will look for both mono and nuget.exe in PATH.
        const monoPath: string = CommonUtils.lookPath('mono');
        const nugetExePath: string = CommonUtils.lookPath('nuget.exe');
        if (!monoPath || !nugetExePath) {
            throw new Error('could neither find nuget client path, nor mono and nuget executable path');
        }
        return monoPath + ' ' + nugetExePath;
    }
}

class DfsHelper {
    constructor(private _visited: boolean, private _notRoot: boolean, private _circular: boolean) {}
    public get circular(): boolean {
        return this._circular;
    }
    public set circular(value: boolean) {
        this._circular = value;
    }
    public get notRoot(): boolean {
        return this._notRoot;
    }
    public set notRoot(value: boolean) {
        this._notRoot = value;
    }
    public get visited(): boolean {
        return this._visited;
    }
    public set visited(value: boolean) {
        this._visited = value;
    }
}

class NugetPackage {
    constructor(
        private _id: string,
        private _version: string,
        private _dependencies: Map<string, boolean>,
        private _dependency?: Dependency
    ) {}

    public get dependencies(): Map<string, boolean> {
        return this._dependencies;
    }
    public set dependencies(value: Map<string, boolean>) {
        this._dependencies = value;
    }
    public get dependency(): Dependency | undefined {
        return this._dependency;
    }
    public set dependency(value: Dependency | undefined) {
        this._dependency = value;
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
}
