import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PackagesExtractor } from '../src/PackagesConfig/Extractor';
import { DependencyDetails, CaseInsensitiveMap } from '../model';
import { NugetPackage } from '../src/PackagesConfig/NugetPackage';

const roots: string[] = [];

afterEach(() => {
    const pending: string[] = roots.splice(0);
    pending.forEach((root: string) => fs.rmSync(root, { recursive: true, force: true }));
});

describe('Packages Config Tests', () => {
    test('NugetPackage group.dependency handles array and single object', () => {
        // Single dependency object
        const nuspecSingle: string = `<?xml version="1.0"?>
        <package>
          <metadata>
            <id>testpkg</id>
            <version>1.0.0</version>
            <dependencies>
              <group>
                <dependency id="dep1" />
              </group>
            </dependencies>
          </metadata>
        </package>`;
        const pkgSingle: NugetPackage = new NugetPackage('testpkg', '1.0.0', nuspecSingle);
        expect(pkgSingle.dependencies.has('dep1')).toBe(true);

        // Multiple dependencies array
        const nuspecArray: string = `<?xml version="1.0"?>
        <package>
          <metadata>
            <id>testpkg</id>
            <version>1.0.0</version>
            <dependencies>
              <group>
                <dependency id="dep1" />
                <dependency id="dep2" />
              </group>
            </dependencies>
          </metadata>
        </package>`;
        const pkgArray: NugetPackage = new NugetPackage('testpkg', '1.0.0', nuspecArray);
        expect(pkgArray.dependencies.has('dep1')).toBe(true);
        expect(pkgArray.dependencies.has('dep2')).toBe(true);

        // Multiple groups with mixed one/multiple dependencies
        const nuspecMixed: string = `<?xml version="1.0"?>
        <package>
          <metadata>
            <id>testpkg</id>
            <version>1.0.0</version>
            <dependencies>
              <group>
                <dependency id="dep1" />
              </group>
              <group>
                <dependency id="dep2" />
                <dependency id="dep3" />
              </group>
            </dependencies>
          </metadata>
        </package>`;
        const pkgMixed: NugetPackage = new NugetPackage('testpkg', '1.0.0', nuspecMixed);
        expect(pkgMixed.dependencies.has('dep1')).toBe(true);
        expect(pkgMixed.dependencies.has('dep2')).toBe(true);
        expect(pkgMixed.dependencies.has('dep3')).toBe(true);
    });

    const resources: string = path.join(__dirname, 'resources');
    const packagesCache: string = path.join(resources, 'packagesconfig', 'packages');

    test('Packages Config Test', () => {
        // Create the packages extractor
        const extractor: PackagesExtractor = new PackagesExtractor(
            new CaseInsensitiveMap<DependencyDetails>(),
            new CaseInsensitiveMap<string[]>()
        );

        // Read packages.config
        const rootPath: string = path.join(resources, 'packagesconfig');
        const packagesConfigPath: string = path.join(rootPath, 'packages.config');
        const packagesConfig: any = extractor.loadPackagesConfig(packagesConfigPath);

        // Extract
        extractor.extract(packagesConfig, packagesCache);

        // Check dependencies
        const dependencies: CaseInsensitiveMap<DependencyDetails> = extractor.allDependencies();
        expect(dependencies.size).toBe(2);
        expect(dependencies.get('bootstrap')?._id).toBe('bootstrap');
        expect(dependencies.get('bootstrap')?._version).toBe('4.0.0');
        expect(dependencies.get('jQuery')?._id).toBe('jQuery');
        expect(dependencies.get('jQuery')?._version).toBe('3.0.0');

        // Check children map
        const childrenMap: CaseInsensitiveMap<string[]> = extractor.childrenMap();
        expect(childrenMap.size).toBe(2);
        expect(childrenMap.get('jquery')).toHaveLength(0);
        const bootstrap: string[] | undefined = childrenMap.get('bootstrap');
        expect(bootstrap).toHaveLength(2);
        expect(bootstrap).toContain('jquery');
        expect(bootstrap).toContain('popper.js');

        // Check direct dependencies
        const directDependencies: string[] = extractor.directDependencies();
        expect(directDependencies).toHaveLength(1);
        expect(directDependencies).toContain('bootstrap');
    });
});

describe('PackagesExtractor global packages command', () => {
    const previousCwd: string = process.cwd();
    const previousPath: string | undefined = process.env.PATH;
    const posixTest = process.platform === 'win32' ? test.skip : test;

    afterEach(() => {
        process.chdir(previousCwd);
        process.env.PATH = previousPath;
    });

    function newExtractor(): PackagesExtractor {
        return new PackagesExtractor(new CaseInsensitiveMap<DependencyDetails>(), new CaseInsensitiveMap<string[]>());
    }

    function makeRoot(): string {
        const root: string = fs.mkdtempSync(path.join(os.tmpdir(), 'nuget-run-'));
        roots.push(root);
        return root;
    }

    function writeRunner(filePath: string, recordPath: string): void {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        const script: string =
            '#!/bin/sh\nprintf "%s\\n" "$@" > "' + recordPath + '"\nprintf "global-packages: /cache\\n"\n';
        fs.writeFileSync(filePath, script, { mode: 0o755 });
    }

    posixTest('starts the PATH client with global-packages arguments and does not start the working-directory file', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const bin: string = path.join(root, 'my bin');
        const cwdRecord: string = path.join(root, 'cwd-ran');
        const pathRecord: string = path.join(root, 'path-ran');
        fs.mkdirSync(cwd);
        writeRunner(path.join(cwd, 'nuget'), cwdRecord);
        writeRunner(path.join(bin, 'nuget'), pathRecord);
        process.chdir(cwd);
        process.env.PATH = bin;

        const output: string = newExtractor().runGlobalPackagesCommand();

        expect(output).toContain('global-packages: /cache');
        expect(fs.readFileSync(pathRecord, 'utf8').trim().split('\n')).toEqual([
            'locals',
            'global-packages',
            '-list',
        ]);
        expect(fs.existsSync(cwdRecord)).toBe(false);
    });

    posixTest('fails when no client is installed and does not start a working-directory file', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const empty: string = path.join(root, 'empty');
        const cwdRecord: string = path.join(root, 'cwd-ran');
        fs.mkdirSync(empty);
        writeRunner(path.join(cwd, 'nuget'), cwdRecord);
        process.chdir(cwd);
        process.env.PATH = empty;

        expect(() => newExtractor().runGlobalPackagesCommand()).toThrow(
            'could neither find nuget client path, nor mono and nuget executable path'
        );
        expect(fs.existsSync(cwdRecord)).toBe(false);
    });

    posixTest('starts mono with nuget.exe and the global-packages arguments when nuget is absent', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const monoDir: string = path.join(root, 'mono bin');
        const exeDir: string = path.join(root, 'exe bin');
        const record: string = path.join(root, 'mono-ran');
        const nugetExe: string = path.join(exeDir, 'nuget.exe');
        fs.mkdirSync(cwd);
        writeRunner(path.join(monoDir, 'mono'), record);
        writeRunner(nugetExe, path.join(root, 'exe-ran'));
        process.chdir(cwd);
        process.env.PATH = `${monoDir}${path.delimiter}${exeDir}`;

        const output: string = newExtractor().runGlobalPackagesCommand();

        expect(output).toContain('global-packages: /cache');
        expect(fs.readFileSync(record, 'utf8').trim().split('\n')).toEqual([
            nugetExe,
            'locals',
            'global-packages',
            '-list',
        ]);
    });

    function touch(filePath: string): void {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, '');
    }

    const nugetArgs: string[] = ['locals', 'global-packages', '-list'];

    test('starts a Windows nuget.exe directly', () => {
        const root: string = makeRoot();
        const exe: string = path.join(root, 'bin', 'nuget.exe');
        touch(exe);

        const spec: ReturnType<typeof PackagesExtractor.toLaunchCommand> = PackagesExtractor.toLaunchCommand(
            exe,
            nugetArgs,
            true,
            path.join(root, 'work'),
            path.join(root, 'System32', 'cmd.exe'),
            path.join(root, 'Windows')
        );

        expect(spec.file).toBe(exe);
        expect(spec.args).toEqual(nugetArgs);
        expect(spec.windowsVerbatimArguments).toBeUndefined();
    });

    test('starts a Windows nuget.cmd through the system command processor', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const batch: string = path.join(root, 'Program Files', 'nuget.cmd');
        const cmdExe: string = path.join(root, 'System32', 'cmd.exe');
        touch(batch);
        touch(cmdExe);

        const spec: ReturnType<typeof PackagesExtractor.toLaunchCommand> = PackagesExtractor.toLaunchCommand(
            batch,
            nugetArgs,
            true,
            cwd,
            cmdExe,
            path.join(root, 'Windows')
        );

        expect(spec.file).toBe(cmdExe);
        expect(spec.windowsVerbatimArguments).toBe(true);
        expect(spec.args).toEqual([
            '/d',
            '/s',
            '/c',
            '""' + batch + '" "locals" "global-packages" "-list""',
        ]);
    });

    test('starts a Windows nuget.bat through the system command processor', () => {
        const root: string = makeRoot();
        const batch: string = path.join(root, 'bin', 'nuget.bat');
        const cmdExe: string = path.join(root, 'Windows', 'System32', 'cmd.exe');
        touch(batch);
        touch(cmdExe);

        const spec: ReturnType<typeof PackagesExtractor.toLaunchCommand> = PackagesExtractor.toLaunchCommand(
            batch,
            nugetArgs,
            true,
            path.join(root, 'work'),
            'cmd',
            path.join(root, 'Windows')
        );

        expect(spec.file).toBe(cmdExe);
        expect(spec.args[0]).toBe('/d');
        expect(spec.args[3]).toContain(batch);
    });

    test('does not start a batch file whose path contains a quote', () => {
        const root: string = makeRoot();
        const cmdExe: string = path.join(root, 'System32', 'cmd.exe');
        touch(cmdExe);

        expect(() =>
            PackagesExtractor.toLaunchCommand(
                path.join(root, 'bad"name', 'nuget.cmd'),
                nugetArgs,
                true,
                path.join(root, 'work'),
                cmdExe,
                path.join(root, 'Windows')
            )
        ).toThrow('Refusing to run a batch file with an unsafe quote or line break in its path or arguments: ');
    });

    test('uses the system command processor when the working directory is a parent of it', () => {
        const root: string = makeRoot();
        const systemCmd: string = path.join(root, 'Windows', 'System32', 'cmd.exe');
        const batch: string = path.join(root, 'bin', 'nuget.cmd');
        touch(systemCmd);
        touch(batch);

        const spec: ReturnType<typeof PackagesExtractor.toLaunchCommand> = PackagesExtractor.toLaunchCommand(
            batch,
            nugetArgs,
            true,
            root,
            systemCmd,
            path.join(root, 'Windows')
        );

        expect(spec.file).toBe(systemCmd);
    });

    test('does not use a command processor that lives in the working directory', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const planted: string = path.join(cwd, 'cmd.exe');
        const systemCmd: string = path.join(root, 'Windows', 'System32', 'cmd.exe');
        const batch: string = path.join(root, 'bin', 'nuget.cmd');
        touch(planted);
        touch(systemCmd);
        touch(batch);

        const spec: ReturnType<typeof PackagesExtractor.toLaunchCommand> = PackagesExtractor.toLaunchCommand(
            batch,
            nugetArgs,
            true,
            cwd,
            planted,
            path.join(root, 'Windows')
        );

        expect(spec.file).toBe(systemCmd);
    });
});
