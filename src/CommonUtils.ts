import * as pathUtils from 'path';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as lodash from 'lodash';

const defaultPathExt: string = '.EXE;.CMD;.BAT;.COM';
import * as parser from 'fast-xml-parser';
import { XMLParser } from 'fast-xml-parser';

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
        const pathExt: string = process.env.PATHEXT || defaultPathExt;
        return CommonUtils.findOnPath(cmd, pathEnv, process.cwd(), CommonUtils.isWindows(), pathExt);
    }

    /**
     * Find cmd on pathEnv, never inside cwd.
     * @param cmd - executable name.
     * @param pathEnv - path entries separated by the platform delimiter for the selected rules.
     * @param cwd - directory that must not supply the executable.
     * @param windows - whether Windows suffix rules apply.
     * @param pathExt - Windows PATHEXT value.
     * @returns path to executable, or empty when none is acceptable.
     */
    public static findOnPath(cmd: string, pathEnv: string, cwd: string, windows: boolean, pathExt: string): string {
        const delimiter: string = windows ? ';' : ':';
        const resolvedCwd: string = CommonUtils.canonical(cwd);
        const suffixes: string[] = CommonUtils.suffixesFor(cmd, windows, pathExt);
        const entries: string[] = pathEnv.split(delimiter);
        for (const entry of entries) {
            let raw: string = entry;
            if (windows && raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
                raw = raw.slice(1, -1);
            }
            const dir: string = pathUtils.resolve(cwd, raw);
            if (CommonUtils.isInside(resolvedCwd, CommonUtils.canonical(dir))) {
                continue;
            }
            const match: string = CommonUtils.matchInDir(dir, cmd, suffixes, windows);
            if (match === '') {
                continue;
            }
            if (CommonUtils.isInside(resolvedCwd, CommonUtils.canonical(match))) {
                continue;
            }
            return match;
        }
        return '';
    }

    private static canonical(filePath: string): string {
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
        const suffixes: string[] = raw.split(';').filter((ext: string) => ext !== '');
        if (cmd.includes('.')) {
            return ['', ...suffixes];
        }
        if (suffixes.length === 0) {
            return [''];
        }
        return suffixes;
    }

    private static matchInDir(dir: string, cmd: string, suffixes: string[], windows: boolean): string {
        let names: string[] = [];
        try {
            names = fse.readdirSync(dir);
        } catch (error) {
            return '';
        }
        for (const suffix of suffixes) {
            const wanted: string = cmd + suffix;
            const found: string | undefined = names.find((name: string) =>
                windows ? name.toLowerCase() === wanted.toLowerCase() : name === wanted
            );
            if (found === undefined) {
                continue;
            }
            const candidate: string = pathUtils.join(dir, found);
            if (!CommonUtils.isRunnableFile(candidate, windows)) {
                continue;
            }
            if (CommonUtils.batchPathIsUnsafe(candidate)) {
                continue;
            }
            return candidate;
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

    private static batchPathIsUnsafe(candidate: string): boolean {
        const extension: string = pathUtils.extname(candidate).toLowerCase();
        if (extension !== '.cmd' && extension !== '.bat') {
            return false;
        }
        return candidate.includes('"') || candidate.includes('\n') || candidate.includes('\r');
    }

    /**
     * True when child is parent, or a file or directory inside parent.
     * Links are resolved before the comparison.
     * @param parent - directory that must not contain child.
     * @param child - path to test.
     * @returns whether child lives in parent.
     */
    public static livesIn(parent: string, child: string): boolean {
        return CommonUtils.isInside(CommonUtils.canonical(parent), CommonUtils.canonical(child));
    }

    private static isInside(parent: string, child: string): boolean {
        const relative: string = pathUtils.relative(pathUtils.resolve(parent), pathUtils.resolve(child));
        if (relative === '') {
            return true;
        }
        return relative !== '..' && !relative.startsWith('..' + pathUtils.sep) && !pathUtils.isAbsolute(relative);
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
