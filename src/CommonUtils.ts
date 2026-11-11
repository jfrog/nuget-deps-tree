import * as pathUtils from 'path';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as lodash from 'lodash';
import log from 'loglevel';
import * as parser from 'fast-xml-parser';
import { XMLParser } from 'fast-xml-parser';

const defaultPathExt: string = '.EXE;.CMD;.BAT;.COM';

export class CommonUtils {
    /**
     * Searches for files with requested 'extension' at the requested 'path'.
     * Not directory recursive.
     * @param path - path to search in.
     * @param extension - extensions to match.
     * @returns array of files matching criteria.
     */
    public static listFilesWithExtension(path: string, extension: string): string[] {
        const files: string[] = [];
        fse.readdirSync(path).forEach((file) => {
            if (pathUtils.extname(file) === extension) {
                files.push(pathUtils.join(path, file));
            }
        });
        return files;
    }

    public static isWindows(): boolean {
        return os.platform() === 'win32';
    }

    public static readFileIfExists(filePath: string): string | undefined {
        if (fse.pathExistsSync(filePath)) {
            return fse.readFileSync(filePath).toString();
        }
    }

    /**
     * Get path of executable (Unix 'which' command equivalent, for both Unix and Windows).
     * @param cmd - executable name.
     * @returns path to executable.
     */
    public static lookPath(cmd: string): string {
        const pathEnv: string = process.env.PATH || '';
        const pathExt: string = process.env.PATHEXT || '';
        return CommonUtils.findOnPath(cmd, pathEnv, process.cwd(), CommonUtils.isWindows(), pathExt);
    }

    /**
     * Find cmd in the absolute entries of pathEnv. Relative and empty entries, and the working directory itself, are skipped.
     * @param cmd - executable name.
     * @param pathEnv - path entries separated by the platform delimiter for the selected rules.
     * @param cwd - working directory, which never supplies the executable.
     * @param windows - whether Windows suffix rules apply.
     * @param pathExt - Windows PATHEXT value.
     * @returns path to executable, or empty when none is acceptable.
     */
    public static findOnPath(cmd: string, pathEnv: string, cwd: string, windows: boolean, pathExt: string): string {
        const delimiter: string = windows ? pathUtils.win32.delimiter : pathUtils.posix.delimiter;
        const suffixes: string[] = CommonUtils.suffixesFor(cmd, windows, pathExt);
        for (const entry of pathEnv.split(delimiter)) {
            let raw: string = entry;
            if (windows && raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
                raw = raw.slice(1, -1);
            }
            if (!pathUtils.isAbsolute(raw)) {
                continue;
            }
            const dir: string = pathUtils.resolve(raw);
            if (CommonUtils.isSamePath(dir, cwd)) {
                continue;
            }
            const match: string = CommonUtils.matchInDir(dir, cmd, suffixes, windows);
            if (match !== '') {
                return match;
            }
        }
        return '';
    }

    /**
     * Absolute location of a path after following symlinks.
     * A path that does not exist is returned absolute, without following links.
     * @param filePath - path to resolve.
     * @returns the real path, or the absolute path when it does not exist.
     */
    private static realPath(filePath: string): string {
        const resolved: string = pathUtils.resolve(filePath);
        try {
            return fse.realpathSync(resolved);
        } catch (error) {
            return resolved;
        }
    }

    private static suffixesFor(cmd: string, windows: boolean, pathExt: string): string[] {
        if (!windows) {
            return [''];
        }
        const raw: string = pathExt || defaultPathExt;
        const suffixes: string[] = raw
            .split(';')
            .filter((ext: string) => ext !== '')
            .map((ext: string) => ext.toLowerCase());
        if (cmd.includes('.')) {
            return ['', ...suffixes];
        }
        if (suffixes.length === 0) {
            return [''];
        }
        return suffixes;
    }

    private static matchInDir(dir: string, cmd: string, suffixes: string[], windows: boolean): string {
        for (const suffix of suffixes) {
            const candidate: string = pathUtils.join(dir, cmd + suffix);
            if (CommonUtils.isRunnableFile(candidate, windows) && !CommonUtils.batchPathIsUnsafe(candidate)) {
                return candidate;
            }
        }
        return '';
    }

    private static isRunnableFile(candidate: string, windows: boolean): boolean {
        let stat: fse.Stats;
        try {
            stat = fse.statSync(candidate);
        } catch (error) {
            return false;
        }
        if (!stat.isFile()) {
            return false;
        }
        if (windows) {
            return true;
        }
        try {
            fse.accessSync(candidate, fse.constants.X_OK);
        } catch (error) {
            return false;
        }
        return true;
    }

    /**
     * True when the file is a Windows batch script (.cmd or .bat), which only runs through cmd.exe.
     * @param filePath - path to check.
     * @returns whether the file is a batch script.
     */
    public static isBatchFile(filePath: string): boolean {
        return ['.cmd', '.bat'].includes(pathUtils.extname(filePath).toLowerCase());
    }

    private static batchPathIsUnsafe(candidate: string): boolean {
        if (!CommonUtils.isBatchFile(candidate)) {
            return false;
        }
        const unsafe: boolean =
            candidate.includes('"') || candidate.includes('%') || candidate.includes('\n') || candidate.includes('\r');
        if (unsafe) {
            log.warn(
                "Skipping '%s': cmd.exe cannot safely run a batch file whose path contains a quote, '%' or a line break.",
                candidate
            );
        }
        return unsafe;
    }

    /**
     * True when both paths point to the same location. Links are resolved before the comparison.
     * @param first - path to compare.
     * @param second - path to compare.
     * @returns whether the paths are the same location.
     */
    public static isSamePath(first: string, second: string): boolean {
        return pathUtils.relative(CommonUtils.realPath(first), CommonUtils.realPath(second)) === '';
    }

    /**
     * Fix path to match the current operating system.
     * @param path - path to fix.
     * @returns fixed path.
     */
    public static fixSeparatorsToMatchOs(path: string): string {
        if (CommonUtils.isWindows()) {
            return path.replace(/\//g, '\\');
        }
        return path.replace(/\\/g, '/');
    }

    /**
     * Get a property in path from object, throw if doesn't exists.
     * @param obj - object to extract property from.
     * @param propertyPath - property's path in object.
     * @param objectName - object name, to print in error message if needed.
     * @returns value of property.
     */
    public static getPropertyStrictly(obj: any, propertyPath: string, objectName: string): any {
        const val: any | undefined = this.getPropertyOrUndefined(obj, propertyPath);
        if (val) {
            return val;
        }
        throw new Error("Expected '" + objectName + "' object to own property in path: '" + propertyPath + "'");
    }

    /**
     * Get a property in path from object, return undefined if not found.
     * Make sure not to use in a loop that isn't 'for in'.
     * @param obj - object to extract property from.
     * @param propertyPath - property's path in object.
     * @returns value of property or undefined.
     */
    public static getPropertyOrUndefined(obj: any, propertyPath: string): any | undefined {
        return lodash.get(obj, propertyPath);
    }

    /**
     * Parse content from xml file to an object.
     * Parsing is done in arrayMode, to always parse tags as arrays excluding leaf nodes.
     * Might throw arrow, call is responsible to catch if needed.
     * @param xmlContent.
     * @returns parsed xml object.
     */
    public static parseXmlToObject(xmlContent: string): any {
        const parser: parser.XMLParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
        return parser.parse(xmlContent);
    }
}
