import * as path from 'path';
import { AssetsUtils } from '../src/AssetsJson/Utils';
import { CommonUtils } from '../src/CommonUtils';

describe('Assets Utils Tests', () => {
    test('Test isPackagePartOfTargetDependencies', () => {
        // Read assets file from: simple-multi-assets/core/obj/project.assets.json
        const assetsFilePath: string = path.join(
            __dirname,
            'resources',
            'packagereferences',
            'simple-multi-assets',
            'core',
            'obj',
            'project.assets.json'
        );
        const assetsContent: string = CommonUtils.readFileIfExists(assetsFilePath) || '';
        expect.stringContaining('target');
        const assets: any = JSON.parse(assetsContent);

        // MyLogger/1.0.0 should appear under 'targets'
        expect(AssetsUtils.isPackagePartOfTargetDependencies(assets, 'mylogger/1.0.0')).toBeTruthy();

        // MyLogger/1.0.1 shouldn't appear under 'targets'
        expect(AssetsUtils.isPackagePartOfTargetDependencies(assets, 'mylogger/1.0.1')).toBeFalsy();
    });
});
