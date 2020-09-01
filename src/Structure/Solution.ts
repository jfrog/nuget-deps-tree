import { ProjectBuilder } from './Project';
import { CommonUtils } from '../CommonUtils';
import * as pathUtils from 'path';
import * as fs from 'fs';
import * as log from 'log4js';
import * as walkdir from 'walkdir';

const packagesFileName: string = 'packages.config';
const assetsFileName: string = 'project.assets.json';
const logger = log.getLogger();

export class Solution {
    constructor(
        private _filePath: string,
        private _projects: ProjectBuilder[] = [],
        private _dependenciesSources: string[] = []
    ) {}

    public get filePath(): string {
        return this._filePath;
    }

    public set filePath(value: string) {
        this._filePath = value;
    }

    public get projects(): ProjectBuilder[] {
        return this._projects;
    }

    public set projects(value: ProjectBuilder[]) {
        this._projects = value;
    }

    public get dependenciesSources(): string[] {
        return this._dependenciesSources;
    }

    public set dependenciesSources(value: string[]) {
        this._dependenciesSources = value;
    }

    public static create(slnFilePath: string): Solution {
        const sln: Solution = new Solution(slnFilePath);
        sln.getDependenciesSources(slnFilePath);
        sln.loadProjects();
        return sln;
    }

    /**
     * Recursively walk through the file system to find all potential dependencies sources:
     * packages.config and project.assets.json files.
     */
    public getDependenciesSources(solutionPath: string) {
        const curDependenciesSources: string[] = [];
        walkdir.find(pathUtils.parse(solutionPath).dir, { follow_symlinks: true, sync: true }, (path: string) => {
            if (path.endsWith(packagesFileName) || path.endsWith(assetsFileName)) {
                curDependenciesSources.push(pathUtils.resolve(path));
                logger.debug('found: ', path);
            }
        });
        // Sort by length ascending.
        curDependenciesSources.sort((a, b) => {
            return a.length - b.length;
        });
        this._dependenciesSources.push(...curDependenciesSources);
    }

    public loadProjects() {
        const slnProjects: string[] = this.getProjectsFromSln();
        if (slnProjects.length > 0) {
            this.loadProjectsFromSolutionFile(slnProjects);
            return;
        }
        this.loadSingleProjectFromDir();
    }

    public loadProjectsFromSolutionFile(slnProjects: string[]) {
        for (const project of slnProjects) {
            try {
                const parsed: ParsedProject = this.parseProject(project, pathUtils.parse(this._filePath).dir);
                if (!parsed.csprojPath.endsWith('.csproj')) {
                    logger.debug(
                        'Skipping a project "%s", since it doesn\'t have a csproj file path.',
                        parsed.projectName
                    );
                    continue;
                }
                this.loadSingleProject(parsed.projectName, parsed.csprojPath);
            } catch (error) {
                logger.error(
                    "Failed parsing and loading project '%s' from solution %s': %s",
                    project,
                    this._filePath,
                    error
                );
            }
        }
    }

    public loadSingleProjectFromDir() {
        const csprojFiles: string[] = CommonUtils.listFilesWithExtension(
            pathUtils.parse(this._filePath).dir,
            '.csproj'
        );
        if (csprojFiles.length === 1) {
            const projectName: string = pathUtils.parse(csprojFiles[0]).name;
            this.loadSingleProject(projectName, csprojFiles[0]);
        }
    }

    public loadSingleProject(projectName: string, csprojPath: string) {
        // First we will find the project's dependencies source.
        // It can be located in the project's root directory or in
        // a directory with the project name under the solution root.
        const projectRootPath: string = pathUtils.dirname(csprojPath);
        const projectPathPattern: string = projectRootPath + pathUtils.sep;
        const projectNamePattern: string = pathUtils.sep + projectName + pathUtils.sep;
        let dependenciesSource: string = '';
        this._dependenciesSources.some((source: string) => {
            if (source.includes(projectPathPattern) || source.includes(projectNamePattern)) {
                dependenciesSource = source;
                return true;
            }
        });

        // If no dependencies source was found, we will skip the current project.
        if (!dependenciesSource) {
            logger.debug('Project dependencies was not found for project: %s', projectName);
        }

        const proj: ProjectBuilder = ProjectBuilder.load(projectName, projectRootPath, dependenciesSource);
        if (proj.extractor) {
            this._projects.push(proj);
        }
    }

    public parseProject(projectLine: string, solutionDir: string): ParsedProject {
        const parsedLine: string[] = projectLine.split('=');
        if (parsedLine.length <= 1) {
            throw new Error('Unexpected project line format: ' + projectLine);
        }

        const projectInfo: string[] = parsedLine[1].split(',');
        if (projectInfo.length <= 2) {
            throw new Error('Unexpected project information format: ' + parsedLine[1]);
        }

        const projectName: string = this.removeQuotes(projectInfo[0]);
        // In case we are running on a non-Windows OS,
        // the solution root path and the relative path to csproj file might used different path separators.
        // We want to make sure we will get a valid path after we join both parts,
        // so we will replace the csproj separators.
        projectInfo[1] = CommonUtils.fixSeparatorsToMatchOs(projectInfo[1]);
        const csprojPath: string = pathUtils.join(solutionDir, this.removeQuotes(projectInfo[1]));
        return new ParsedProject(projectName, csprojPath);
    }

    public removeQuotes(value: string): string {
        return value.trim().replace(/^\"|\"$/g, '');
    }

    public getProjectsFromSln(): string[] {
        return this.parseSlnFile(this._filePath);
    }

    public parseSlnFile(slnFile: string): string[] {
        let projects: string[] = [];
        const content: string = fs.readFileSync(slnFile).toString();
        const re: RegExp = /Project\("(.*)(\r\n|\r|\n)EndProject/g;
        const matches: RegExpMatchArray | null = content.match(re);
        if (matches) {
            projects = matches;
        }
        return projects;
    }
}

class ParsedProject {
    constructor(private _projectName: string, private _csprojPath: string) {}

    public get csprojPath(): string {
        return this._csprojPath;
    }
    public set csprojPath(value: string) {
        this._csprojPath = value;
    }
    public get projectName(): string {
        return this._projectName;
    }
    public set projectName(value: string) {
        this._projectName = value;
    }
}
