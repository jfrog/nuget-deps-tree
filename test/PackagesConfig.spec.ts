import * as path from 'path';
import { PackagesExtractor } from '../src/PackagesConfig/Extractor';
import { Dependency } from '../src/Structure/Dependency';

describe('Packages Config Tests', () => {
    const resources: string = path.join(__dirname, 'resources');
    const packagesCache: string = path.join(resources, 'packagesconfig', 'packages');

    test('Packages Config Test', () => {
        // Create the packages extractor
        const extractor: PackagesExtractor = new PackagesExtractor(
            new Map<string, Dependency>(),
            new Map<string, string[]>()
        );

        // Read packages.config
        const rootPath: string = path.join(resources, 'packagesconfig');
        const packagesConfigPath: string = path.join(rootPath, 'packages.config');
        const packagesConfig: any = extractor.loadPackagesConfig(packagesConfigPath);

        // Extract
        extractor.extract(packagesConfig, packagesCache);

        // Check dependencies
        const dependencies: Map<string, Dependency> = extractor.allDependencies();
        expect(dependencies.size).toBe(2);
        expect(dependencies.get('bootstrap')?.id).toBe('bootstrap:4.0.0');
        expect(dependencies.get('jquery')?.id).toBe('jQuery:3.0.0');

        // Check children map
        const childrenMap: Map<string, string[]> = extractor.childrenMap();
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
