import * as path from 'path';
import { ProjectBuilder } from '../src/Structure/Project';
import { Solution } from '../src/Structure/Solution';

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
});
