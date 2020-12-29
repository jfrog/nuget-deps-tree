import * as log from 'log4js';
import { NugetDepsTree } from '../src';
import * as pathUtils from 'path';

const logger = log.getLogger();

describe('Nuget Deps Tree Tests', () => {
    test('Run', () => {
        const tree: any = NugetDepsTree.generate(
            pathUtils.join(__dirname, 'resources', 'packagereferences', 'simple-multi-assets', 'assets.sln')
        );
        expect(tree.projects).toHaveLength(2);
        logger.info(tree);
    });
});
