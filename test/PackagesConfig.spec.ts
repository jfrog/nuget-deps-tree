import * as path from 'path';
import { PackagesExtractor } from '../src/PackagesConfig/Extractor';
import { DependencyDetails, CaseInsensitiveMap } from '../model';

describe('Packages Config Tests', () => {
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
