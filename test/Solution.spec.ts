import * as path from 'path';
import { ProjectBuilder } from '../src/Structure/Project';
import { Solution } from '../src/Structure/Solution';
import * as pathUtils from 'path';

describe('Solution Tests', () => {
    const packageReferences: string = path.join(__dirname, 'resources', 'packagereferences');

    test('No project in sln', () => {
        // Read solution
        const rootPath: string = path.join(packageReferences, 'noproject');
        const projectPath: string = path.join(rootPath, 'noproject.sln');
        const expectedDependenciesSource: string = path.join(rootPath, 'obj', 'project.assets.json');
        const solution: Solution = Solution.create(projectPath);

        // Check dependencies source
        expect(solution.dependenciesSources).toHaveLength(1);
        expect(solution.dependenciesSources).toContain(expectedDependenciesSource);

        // Check project
        expect(solution.projects).toHaveLength(1);
        const project: ProjectBuilder = solution.projects[0];
        expect(project.name).toBe('noproject');
        expect(project.rootPath).toBe(rootPath);
        expect(project.dependenciesSource).toBeDefined();
        expect(project.dependenciesSource).toBe(expectedDependenciesSource);
        expect(project.extractor).toBeDefined();
    });

    test('One project in sln', () => {
        // Create solution
        const rootPath: string = path.join(packageReferences, 'oneproject');
        const projectPath: string = path.join(rootPath, 'oneproject.sln');
        const expectedDependenciesSource: string = path.join(rootPath, 'obj', 'project.assets.json');
        const solution: Solution = Solution.create(projectPath);

        // Check dependencies source
        expect(solution.dependenciesSources).toHaveLength(1);
        expect(solution.dependenciesSources).toContain(expectedDependenciesSource);

        // Check project
        expect(solution.projects).toHaveLength(1);
        const project: ProjectBuilder = solution.projects[0];
        expect(project.name).toBe('packagesconfig');
        expect(project.rootPath).toBe(rootPath);
        expect(project.dependenciesSource).toBeDefined();
        expect(project.dependenciesSource).toBe(expectedDependenciesSource);
        expect(project.extractor).toBeDefined();
    });

    test('Multi projects in sln', () => {
        // Create solution
        const rootPath: string = path.join(packageReferences, 'multiprojects');
        const projectPath: string = path.join(rootPath, 'multiprojects.sln');
        const expectedDependenciesSource: string = path.join(rootPath, 'obj', 'project.assets.json');
        const expectedDependenciesTestSource: string = path.join(rootPath, 'test', 'obj', 'project.assets.json');
        const solution: Solution = Solution.create(projectPath);

        // Check dependencies sources
        expect(solution.dependenciesSources).toHaveLength(2);
        expect(solution.dependenciesSources).toContain(expectedDependenciesSource);
        expect(solution.dependenciesSources).toContain(expectedDependenciesTestSource);

        // Check projects
        expect(solution.projects).toHaveLength(2);
        for (const project of solution.projects) {
            expect(project.extractor).toBeDefined();
            switch (project.name) {
                case 'packagesconfigmulti':
                    expect(project.rootPath).toBe(rootPath);
                    expect(project.dependenciesSource).toBe(expectedDependenciesSource);
                    break;
                case 'packagesconfiganothermulti':
                    expect(project.rootPath).toBe(path.join(rootPath, 'test'));
                    expect(project.dependenciesSource).toBe(expectedDependenciesTestSource);
                    break;
                default:
                    fail('unexpected project ' + project.name);
            }
        }
    });
    
    describe('loadProject dependencies source matching', () => {
        function createDummyProjectBuilder(
            name: string,
            rootPath: string,
            dependenciesSource: string
        ): any {
            return {
                name,
                rootPath,
                dependenciesSource,
                extractor: true
            };
        }

        test('matches dependencies source in project root', () => {
            const projectName: string = 'myproject';
            const rootPath: string = '/repo/projects/myproject';
            const csprojPath: string = pathUtils.join(rootPath, 'myproject.csproj');
            const depSource: string = pathUtils.join(rootPath, 'project.assets.json');
            const solution: Solution = new Solution('/repo/projects/solution.sln');
            solution.dependenciesSources = [depSource];
            // Patch ProjectBuilder.load to return dummy
            (ProjectBuilder as any).load = jest.fn(() => createDummyProjectBuilder(projectName, rootPath, depSource));
            solution.loadProject(projectName, csprojPath);
            expect(solution.projects).toHaveLength(1);
            expect(solution.projects[0].dependenciesSource).toBe(depSource);
        });

        test('matches dependencies source under project directory', () => {
            const projectName: string = 'myproject';
            const rootPath: string = '/repo/projects/myproject';
            const csprojPath: string = pathUtils.join(rootPath, 'myproject.csproj');
            const depSource: string = pathUtils.join(rootPath, 'subdir', 'project.assets.json');
            const solution: Solution = new Solution('/repo/projects/solution.sln');
            solution.dependenciesSources = [depSource];
            (ProjectBuilder as any).load = jest.fn(() => createDummyProjectBuilder(projectName, rootPath, depSource));
            solution.loadProject(projectName, csprojPath);
            expect(solution.projects).toHaveLength(1);
            expect(solution.projects[0].dependenciesSource).toBe(depSource);
        });

        test('matches dependencies source ending with project name', () => {
            const projectName: string = 'myproject';
            const rootPath: string = '/repo/projects/myproject';
            const csprojPath: string = pathUtils.join(rootPath, 'myproject.csproj');
            const depSource: string = '/repo/projects/otherdir/myproject';
            const solution: Solution = new Solution('/repo/projects/solution.sln');
            solution.dependenciesSources = [depSource];
            (ProjectBuilder as any).load = jest.fn(() => createDummyProjectBuilder(projectName, rootPath, depSource));
            solution.loadProject(projectName, csprojPath);
            expect(solution.projects).toHaveLength(1);
            expect(solution.projects[0].dependenciesSource).toBe(depSource);
        });

        test('multiple sources, only correct one matched', () => {
            const projectName: string = 'myproject';
            const rootPath: string = '/repo/projects/myproject';
            const csprojPath: string = pathUtils.join(rootPath, 'myproject.csproj');
            const depSource1: string = '/repo/projects/otherdir/otherproject';
            const depSource2: string = pathUtils.join(rootPath, 'project.assets.json');
            const depSource3: string = '/repo/projects/otherdir/myproject';
            const solution: Solution = new Solution('/repo/projects/solution.sln');
            solution.dependenciesSources = [depSource1, depSource2, depSource3];
            (ProjectBuilder as any).load = jest.fn(() => createDummyProjectBuilder(projectName, rootPath, depSource2));
            solution.loadProject(projectName, csprojPath);
            expect(solution.projects).toHaveLength(1);
            expect(solution.projects[0].dependenciesSource).toBe(depSource2);
        });

        test('no matching source, dependenciesSource is empty', () => {
            const projectName: string = 'myproject';
            const rootPath: string = '/repo/projects/myproject';
            const csprojPath: string = pathUtils.join(rootPath, 'myproject.csproj');
            const depSource: string = '/repo/projects/otherdir/otherproject';
            const solution: Solution = new Solution('/repo/projects/solution.sln');
            solution.dependenciesSources = [depSource];
            (ProjectBuilder as any).load = jest.fn((name: string, root: string, source: string) => {
                expect(source).toBe('');
                return createDummyProjectBuilder(name, root, source);
            });
            solution.loadProject(projectName, csprojPath);
            expect(solution.projects).toHaveLength(1);
            expect(solution.projects[0].dependenciesSource).toBe('');
        });
    });
});
