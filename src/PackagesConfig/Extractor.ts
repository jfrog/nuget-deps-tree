import * as exec from 'child_process';
import * as fse from 'fs-extra';
import log from 'loglevel';
import * as pathUtils from 'path';
import { CaseInsensitiveMap, DependencyDetails, Extractor } from '../../model';
import { CommonUtils } from '../CommonUtils';
import { absentNupkgWarnMsg } from '../DependencyTree/Utils';
import { Dependency } from '../Structure/Dependency';
import { NugetPackage } from './NugetPackage';

const packagesFileName: string = 'packages.config';

type ResolvedCommand = { file: string; args: string[] };

type StartSpec = { file: string; args: string[]; windowsVerbatimArguments?: boolean };

export class PackagesExtractor implements Extractor {
    constructor(
        private _allDependencies: CaseInsensitiveMap<DependencyDetails>,
        private _childrenMap: CaseInsensitiveMap<string[]>
    ) {}

    /**
     * Get map of all the dependencies of the project.
     * @returns map of lower cased dependencies IDs and their actual details.
     */
    public allDependencies(): CaseInsensitiveMap<DependencyDetails> {
        return this._allDependencies;
    }

    /**
     * Get array of all the root dependencies of the project.
     * @returns array of the lower cased IDs of all root dependencies
     */
    public directDependencies(): string[] {
        return this.getDirectDependencies(this._allDependencies, this._childrenMap);
    }

    /**
     * Get map of the dependencies relations map.
     * @returns map of lower cased dependencies IDs and an array of their lower cased dependencies IDs
     */
    public childrenMap(): CaseInsensitiveMap<string[]> {
        return this._childrenMap;
    }

    /**
     * Checks if the project's dependencies source is of packages config type.
     * @param projectName
     * @param dependenciesSource
     * @returns true if compatible
     */
    public static isCompatible(projectName: string, dependenciesSource: string): boolean {
        if (dependenciesSource.endsWith(packagesFileName)) {
            log.debug('Found', dependenciesSource, 'file for project:', projectName);
            return true;
        }
        return false;
    }

    /**
     * Create new package config extractor.
     * @param dependenciesSource
     * @returns packages config extractor
     */
    public static newExtractor(dependenciesSource: string): Extractor {
        const newPkgExtractor: PackagesExtractor = new PackagesExtractor(
            new CaseInsensitiveMap<DependencyDetails>(),
            new CaseInsensitiveMap<string[]>()
        );
        const packagesConfig: any = newPkgExtractor.loadPackagesConfig(dependenciesSource);
        const globalPackagesCache: string = newPkgExtractor.getGlobalPackagesCache();
        newPkgExtractor.extract(packagesConfig, globalPackagesCache);
        return newPkgExtractor;
    }

    /**
     * Get direct dependencies using DFS on all dependencies and children map.
     * @param allDependencies
     * @param childrenMap
     * @returns array of the ids' of all root dependencies
     */
    public getDirectDependencies(
        allDependencies: CaseInsensitiveMap<DependencyDetails>,
        childrenMap: CaseInsensitiveMap<string[]>
    ): string[] {
        const helper: CaseInsensitiveMap<DfsHelper> = new CaseInsensitiveMap<DfsHelper>();
        for (const id of allDependencies.keys()) {
            helper.set(id, new DfsHelper(false, false, false));
        }

        for (const id of allDependencies.keys()) {
            if (helper.get(id)?.visited) {
                continue;
            }
            this.searchRootDependencies(helper, id, allDependencies, childrenMap, new CaseInsensitiveMap([[id, true]]));
        }

        const rootDependencies: string[] = [];
        helper.forEach((nodeData: DfsHelper, id: string) => {
            if (!nodeData.notRoot || nodeData.circular) {
                rootDependencies.push(id);
            }
        });

        return rootDependencies;
    }

    /**
     * Search for root dependencies and update maps accordingly.
     * @param dfsHelper
     * @param currentId
     * @param allDependencies
     * @param childrenMap
     * @param traversePath
     */
    public searchRootDependencies(
        dfsHelper: CaseInsensitiveMap<DfsHelper>,
        currentId: string,
        allDependencies: CaseInsensitiveMap<DependencyDetails>,
        childrenMap: CaseInsensitiveMap<string[]>,
        traversePath: CaseInsensitiveMap<boolean>
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

    /**
     * Get dfs helper for requested key.
     * @param dfsHelper
     * @param key
     * @returns dfs helper.
     */
    public getDfs(dfsHelper: CaseInsensitiveMap<DfsHelper>, key: string): DfsHelper {
        let dfs: DfsHelper | undefined = dfsHelper.get(key);
        if (!dfs) {
            dfs = new DfsHelper(false, false, false);
            dfsHelper.set(key, dfs);
        }
        return dfs;
    }

    /**
     * Extract all the extractor's needed dependencies map from the packages config file.
     * @param packagesConfig
     * @param globalPackagesCache
     */
    public extract(packagesConfig: any, globalPackagesCache: string) {
        let packages: any = CommonUtils.getPropertyOrUndefined(packagesConfig, 'packages.package');
        if (!packages) {
            return;
        }
        if (!Array.isArray(packages)) {
            packages = [packages];
        }
        for (const nuget of packages) {
            const id: string = nuget.id;
            const version: string = nuget.version;

            // First lets check if the original version exists within the file system:
            let pack: NugetPackage | undefined = this.createNugetPackage(globalPackagesCache, id, version);
            if (!pack) {
                // If doesn't exist lets build the array of alternative versions.
                const alternativeVersions: string[] = this.createAlternativeVersionForms(version);
                // Now lets do a loop to run over the alternative possibilities.
                for (const v of alternativeVersions) {
                    pack = this.createNugetPackage(globalPackagesCache, id, v);
                    if (pack) {
                        break;
                    }
                }
            }

            if (pack) {
                this._allDependencies.set(id, new Dependency(id, version));
                this._childrenMap.set(id, Array.from(pack.dependencies.keys()));
            } else {
                log.warn(
                    'The following NuGet package %s with version %s was not found in the NuGet cache %s.' +
                        absentNupkgWarnMsg,
                    nuget.id,
                    nuget.version,
                    globalPackagesCache
                );
            }
        }
    }

    /**
     * Creates a nuget package if found in cache in the requested version.
     * @param packagesPath - Path to global packages cache.
     * @param packageId - Requested package id.
     * @param packageVersion - Requested package version.
     * @returns A nuget package, or undefined if not found in cache.
     */
    public createNugetPackage(
        packagesPath: string,
        packageId: string,
        packageVersion: string
    ): NugetPackage | undefined {
        // Nuspec file that holds the metadata for the package. Id in path is lower cased.
        const nuspecPath: string = pathUtils.join(
            packagesPath,
            packageId.toLowerCase(),
            packageVersion,
            [packageId.toLowerCase(), 'nuspec'].join('.')
        );
        // File does not exist for package with that version.
        if (!fse.pathExistsSync(nuspecPath)) {
            return undefined;
        }

        const nuspecContent: string | undefined = CommonUtils.readFileIfExists(nuspecPath);
        if (!nuspecContent) {
            throw new Error('Unable to read file: ' + nuspecPath);
        }
        return new NugetPackage(packageId, packageVersion, nuspecContent);
    }

    /**
     * NuGet allows the version to be with missing or unnecessary zeros.
     * This method generates an array of the possible alternative versions.
     * For example:
     * "1.0" --> []string{"1.0.0.0", "1.0.0", "1"}
     * "1" --> []string{"1.0.0.0", "1.0.0", "1.0"}
     * "1.2" --> []string{"1.2.0.0", "1.2.0"}
     * "1.22.33" --> []string{"1.22.33.0"}
     * "1.22.33.44" --> []string{}
     * "1.0.2" --> []string{"1.0.2.0"}
     * @param originalVersion - version listed in the packages config file.
     * @returns array of possible alternative versions.
     */
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

    /**
     * Load packages config data, by reading the xml file and parsing.
     * @param dependenciesSource.
     * @returns packages config object.
     */
    public loadPackagesConfig(dependenciesSource: string): any {
        const content: string | undefined = CommonUtils.readFileIfExists(dependenciesSource);
        if (!content) {
            throw new Error('Unable to read file: ' + dependenciesSource);
        }
        return CommonUtils.parseXmlToObject(content);
    }

    /**
     * Get global packages cache path.
     * @returns path to cache.
     */
    public getGlobalPackagesCache(): string {
        const output: string = this.runGlobalPackagesCommand();
        const globalPackagesPath: string = this.removeGlobalPackagesPrefix(output);
        if (!fse.pathExists(globalPackagesPath)) {
            throw new Error('Could not find global packages path at: ' + globalPackagesPath);
        }
        return globalPackagesPath;
    }

    /**
     * Removes prefix from global packages command.
     * @param line - output of the command.
     * @returns - output after removing prefix.
     */
    public removeGlobalPackagesPrefix(line: string): string {
        return line.replace(/^global-packages:/, '').trim();
    }

    /**
     * Run global packages command.
     * @returns command output.
     */
    public runGlobalPackagesCommand(): string {
        const command: ResolvedCommand = this.resolveCommand();
        const spec: StartSpec = PackagesExtractor.startSpec(
            command.file,
            command.args,
            CommonUtils.isWindows(),
            process.cwd(),
            process.env.ComSpec || '',
            process.env.SystemRoot || ''
        );
        const shown: string = [spec.file, ...spec.args].join(' ');
        const options: { maxBuffer: number; windowsVerbatimArguments?: boolean } = { maxBuffer: 10485760 };
        if (spec.windowsVerbatimArguments === true) {
            options.windowsVerbatimArguments = true;
        }
        try {
            return exec.execFileSync(spec.file, spec.args, options).toString();
        } catch (error) {
            throw new Error("Running '" + shown + "' failed with error: " + error);
        }
    }

    /**
     * How to start a resolved client. Executables start directly.
     * Windows batch files start through the system command processor, never one found on PATH.
     * @param file - resolved client path.
     * @param args - arguments for the client.
     * @param windows - whether Windows batch rules apply.
     * @param cwd - working directory that must not supply the command processor.
     * @param comSpec - candidate command processor path.
     * @param systemRoot - Windows directory used when comSpec is not acceptable.
     * @returns the file and arguments for execFile.
     */
    public static startSpec(
        file: string,
        args: readonly string[],
        windows: boolean,
        cwd: string,
        comSpec: string,
        systemRoot: string
    ): StartSpec {
        const extension: string = pathUtils.extname(file).toLowerCase();
        if (!windows || (extension !== '.cmd' && extension !== '.bat')) {
            return { file: file, args: [...args] };
        }
        const cmdExe: string = PackagesExtractor.pinnedCmdExe(file, cwd, comSpec, systemRoot);
        const commandLine: string = [file, ...args].map((arg: string) => PackagesExtractor.quoteCmdArg(arg)).join(' ');
        return {
            file: cmdExe,
            args: ['/d', '/s', '/c', '"' + commandLine + '"'],
            windowsVerbatimArguments: true,
        };
    }

    private static pinnedCmdExe(file: string, cwd: string, comSpec: string, systemRoot: string): string {
        if (PackagesExtractor.isAcceptableCmd(comSpec, cwd)) {
            return comSpec;
        }
        const fallback: string = pathUtils.join(systemRoot, 'System32', 'cmd.exe');
        if (PackagesExtractor.isAcceptableCmd(fallback, cwd)) {
            return fallback;
        }
        throw new Error('Could not find the system command processor to run: ' + file);
    }

    private static isAcceptableCmd(candidate: string, cwd: string): boolean {
        if (!pathUtils.isAbsolute(candidate)) {
            return false;
        }
        if (pathUtils.basename(candidate).toLowerCase() !== 'cmd.exe') {
            return false;
        }
        if (!fse.pathExistsSync(candidate)) {
            return false;
        }
        return !CommonUtils.livesIn(cwd, candidate);
    }

    private static quoteCmdArg(arg: string): string {
        if (arg.includes('"') || arg.includes('\n') || arg.includes('\r')) {
            throw new Error(
                'Refusing to run a batch file with an unsafe quote or line break in its path or arguments: ' + arg
            );
        }
        const escaped: string = arg.replace(/%/g, '%%');
        return '"' + escaped + '"';
    }

    /**
     * Program to start, and the arguments that follow it.
     * The program is never taken from the working directory.
     */
    private resolveCommand(): ResolvedCommand {
        const nugetArgs: string[] = ['locals', 'global-packages', '-list'];
        const nugetPath: string = CommonUtils.lookPath('nuget');
        if (nugetPath) {
            return { file: nugetPath, args: nugetArgs };
        }
        if (CommonUtils.isWindows()) {
            throw new Error('could neither find nuget client path, nor mono and nuget executable path');
        }
        const monoPath: string = CommonUtils.lookPath('mono');
        const nugetExePath: string = CommonUtils.lookPath('nuget.exe');
        if (!monoPath || !nugetExePath) {
            throw new Error('could neither find nuget client path, nor mono and nuget executable path');
        }
        return { file: monoPath, args: [nugetExePath, ...nugetArgs] };
    }

    /**
     * Get path of executable suitable for running the command, according to the operating system.
     */
    public getExecutablePath(): string {
        return this.resolveCommand().file;
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
