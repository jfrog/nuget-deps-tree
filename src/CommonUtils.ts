import * as pathUtils from 'path';
import * as fse from 'fs-extra';
import * as os from 'os';
import which from 'which';

export class CommonUtils {
    /**
     * Non recursively searches for files with @param extension at the provided @param path.
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

    public static lookPath(cmd: string): string {
        return which.sync(cmd, { nothrow: true }) || '';
    }

    public static fixSeparatorsToMatchOs(path: string) {
        if (CommonUtils.isWindows()) {
            return path.replace(/\//g, '\\');
        }
        return path.replace(/\\/g, '/');
    }
}
