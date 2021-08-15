import log from 'loglevel';
import * as pathUtils from 'path';
import { NugetDepsTree } from '../src';

describe('Nuget Deps Tree Tests', () => {
    test('Run', () => {
        const tree: any = NugetDepsTree.generate(
            pathUtils.join(__dirname, 'resources', 'packagereferences', 'simple-multi-assets', 'assets.sln')
        );
        expect(tree.projects).toHaveLength(2);
        log.info(tree);
    });
});
