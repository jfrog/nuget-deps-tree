import * as pathUtils from 'path';
import * as fse from 'fs-extra';
import * as os from 'os';
import which from 'which';
import * as lodash from 'lodash';
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
        return which.sync(cmd, { nothrow: true }) || '';
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
