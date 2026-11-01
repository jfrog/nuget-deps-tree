import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CommonUtils } from '../src/CommonUtils';

const PATHEXT: string = '.COM;.EXE;.BAT;.CMD';
const roots: string[] = [];

afterEach(() => {
    const pending: string[] = roots.splice(0);
    pending.forEach((root: string) => fs.rmSync(root, { recursive: true, force: true }));
});

function makeRoot(): string {
    const root: string = fs.mkdtempSync(path.join(os.tmpdir(), 'nuget-lookup-'));
    roots.push(root);
    return root;
}

function writeFile(filePath: string, executable: boolean): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '');
    fs.chmodSync(filePath, executable ? 0o755 : 0o644);
}

describe('CommonUtils.findOnPath', () => {
    const posixTest = process.platform === 'win32' ? test.skip : test;

    test('returns the client on PATH when the working directory also has one', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const bin: string = path.join(root, 'bin');
        writeFile(path.join(cwd, 'nuget'), true);
        writeFile(path.join(bin, 'nuget'), true);

        const found: string = CommonUtils.findOnPath('nuget', bin, cwd, false, '');

        expect(found).toBe(path.join(bin, 'nuget'));
    });

    test('skips a PATH entry that is the working directory and uses a later client', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const bin: string = path.join(root, 'bin');
        writeFile(path.join(cwd, 'nuget'), true);
        writeFile(path.join(bin, 'nuget'), true);

        const found: string = CommonUtils.findOnPath('nuget', `${cwd}${path.delimiter}${bin}`, cwd, false, '');

        expect(found).toBe(path.join(bin, 'nuget'));
    });

    test('skips a dot PATH entry and uses a later client', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const bin: string = path.join(root, 'bin');
        writeFile(path.join(cwd, 'nuget'), true);
        writeFile(path.join(bin, 'nuget'), true);

        const found: string = CommonUtils.findOnPath('nuget', `.${path.delimiter}${bin}`, cwd, false, '');

        expect(found).toBe(path.join(bin, 'nuget'));
    });

    test('returns empty when the only client is in the working directory', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        writeFile(path.join(cwd, 'nuget'), true);

        const found: string = CommonUtils.findOnPath('nuget', cwd, cwd, false, '');

        expect(found).toBe('');
    });

    test('returns empty when PATH is empty', () => {
        const cwd: string = makeRoot();

        const found: string = CommonUtils.findOnPath('nuget', '', cwd, false, '');

        expect(found).toBe('');
    });

    test('skips a PATH entry inside the working directory', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const nested: string = path.join(cwd, 'tools');
        const bin: string = path.join(root, 'bin');
        writeFile(path.join(nested, 'nuget'), true);
        writeFile(path.join(bin, 'nuget'), true);

        const found: string = CommonUtils.findOnPath('nuget', `${nested}${path.delimiter}${bin}`, cwd, false, '');

        expect(found).toBe(path.join(bin, 'nuget'));
    });

    test('skips a PATH file that is a symlink into the working directory', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const planted: string = path.join(cwd, 'nuget');
        const bin: string = path.join(root, 'bin');
        const later: string = path.join(root, 'later');
        writeFile(planted, true);
        fs.mkdirSync(bin);
        fs.symlinkSync(planted, path.join(bin, 'nuget'));
        writeFile(path.join(later, 'nuget'), true);

        const found: string = CommonUtils.findOnPath('nuget', `${bin}${path.delimiter}${later}`, cwd, false, '');

        expect(found).toBe(path.join(later, 'nuget'));
    });

    test('skips a non-executable name and uses a later executable', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const plain: string = path.join(root, 'plain');
        const bin: string = path.join(root, 'bin');
        fs.mkdirSync(cwd);
        writeFile(path.join(plain, 'nuget'), false);
        writeFile(path.join(bin, 'nuget'), true);

        const found: string = CommonUtils.findOnPath('nuget', `${plain}${path.delimiter}${bin}`, cwd, false, '');

        expect(found).toBe(path.join(bin, 'nuget'));
    });

    test('on Windows rules prefers nuget.exe on PATH over cmd and bat and over the working directory', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const bin: string = path.join(root, 'bin');
        writeFile(path.join(cwd, 'nuget.exe'), false);
        writeFile(path.join(bin, 'nuget.bat'), false);
        writeFile(path.join(bin, 'nuget.cmd'), false);
        writeFile(path.join(bin, 'nuget.exe'), false);

        const found: string = CommonUtils.findOnPath('nuget', bin, cwd, true, PATHEXT);

        expect(found).toBe(path.join(bin, 'nuget.exe'));
    });

    test('on Windows rules returns nuget.cmd from PATH and not from the working directory', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const bin: string = path.join(root, 'bin');
        writeFile(path.join(cwd, 'nuget.cmd'), false);
        writeFile(path.join(bin, 'nuget.cmd'), false);

        const found: string = CommonUtils.findOnPath('nuget', `${cwd};${bin}`, cwd, true, PATHEXT);

        expect(found).toBe(path.join(bin, 'nuget.cmd'));
    });

    test('on Windows rules returns nuget.bat from PATH and not from the working directory', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const bin: string = path.join(root, 'bin');
        writeFile(path.join(cwd, 'nuget.bat'), false);
        writeFile(path.join(bin, 'nuget.bat'), false);

        const found: string = CommonUtils.findOnPath('nuget', `${cwd};${bin}`, cwd, true, PATHEXT);

        expect(found).toBe(path.join(bin, 'nuget.bat'));
    });

    test('on Windows rules strips quotes around a PATH entry', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const bin: string = path.join(root, 'Program Files');
        fs.mkdirSync(cwd);
        writeFile(path.join(bin, 'nuget.exe'), false);

        const found: string = CommonUtils.findOnPath('nuget', '"' + bin + '"', cwd, true, PATHEXT);

        expect(found).toBe(path.join(bin, 'nuget.exe'));
    });

    posixTest('on Windows rules skips a batch path that contains a quote and uses a later client', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const bad: string = path.join(root, 'bad"dir');
        const bin: string = path.join(root, 'bin');
        fs.mkdirSync(cwd);
        writeFile(path.join(bad, 'nuget.cmd'), false);
        writeFile(path.join(bin, 'nuget.cmd'), false);

        const found: string = CommonUtils.findOnPath('nuget', bad + ';' + bin, cwd, true, PATHEXT);

        expect(found).toBe(path.join(bin, 'nuget.cmd'));
    });
});

describe('CommonUtils.lookPath', () => {
    const previousCwd: string = process.cwd();
    const previousPath: string | undefined = process.env.PATH;

    afterEach(() => {
        process.chdir(previousCwd);
        process.env.PATH = previousPath;
    });

    test('skips a client in the working directory when PATH lists that directory', () => {
        const root: string = makeRoot();
        const cwd: string = path.join(root, 'work');
        const bin: string = path.join(root, 'bin');
        const command: string = process.platform === 'win32' ? 'nuget-lookup-fixture.exe' : 'nuget-lookup-fixture';
        fs.mkdirSync(cwd);
        writeFile(path.join(cwd, command), true);
        writeFile(path.join(bin, command), true);
        process.chdir(cwd);
        process.env.PATH = `${cwd}${path.delimiter}${bin}`;

        const found: string = CommonUtils.lookPath(command);

        expect(found).toBe(path.join(bin, command));
    });
});
