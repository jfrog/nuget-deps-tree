import * as path from 'path';
import { PackagesExtractor } from '../src/PackagesConfig/Extractor';
import { DependencyDetails, CaseInsensitiveMap } from '../model';
import { NugetPackage } from '../src/PackagesConfig/NugetPackage';

describe('Packages Config Tests', () => {
    test('NugetPackage group.dependency handles array and single object', () => {
        // Single dependency object
        const nuspecSingle: string = `<?xml version="1.0"?>
        <package>
          <metadata>
            <id>testpkg</id>
            <version>1.0.0</version>
            <dependencies>
              <group>
                <dependency id="dep1" />
              </group>
            </dependencies>
          </metadata>
        </package>`;
        const pkgSingle: NugetPackage = new NugetPackage('testpkg', '1.0.0', nuspecSingle);
        expect(pkgSingle.dependencies.has('dep1')).toBe(true);

        // Multiple dependencies array
        const nuspecArray: string = `<?xml version="1.0"?>
        <package>
          <metadata>
            <id>testpkg</id>
            <version>1.0.0</version>
            <dependencies>
              <group>
                <dependency id="dep1" />
                <dependency id="dep2" />
              </group>
            </dependencies>
          </metadata>
        </package>`;
        const pkgArray: NugetPackage = new NugetPackage('testpkg', '1.0.0', nuspecArray);
        expect(pkgArray.dependencies.has('dep1')).toBe(true);
        expect(pkgArray.dependencies.has('dep2')).toBe(true);

        // Multiple groups with mixed one/multiple dependencies
        const nuspecMixed: string = `<?xml version="1.0"?>
        <package>
          <metadata>
            <id>testpkg</id>
            <version>1.0.0</version>
            <dependencies>
              <group>
                <dependency id="dep1" />
              </group>
              <group>
                <dependency id="dep2" />
                <dependency id="dep3" />
              </group>
            </dependencies>
          </metadata>
        </package>`;
        const pkgMixed: NugetPackage = new NugetPackage('testpkg', '1.0.0', nuspecMixed);
        expect(pkgMixed.dependencies.has('dep1')).toBe(true);
        expect(pkgMixed.dependencies.has('dep2')).toBe(true);
        expect(pkgMixed.dependencies.has('dep3')).toBe(true);
    });

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
