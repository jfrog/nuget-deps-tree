import { DependencyTree } from '../src/DependencyTree/Tree';
import { DependencyDetails, CaseInsensitiveMap } from '../model';

describe('Dependency Tree Tests', () => {
    test('Create dependency tree', () => {
        // Create dependency tree: 'parent' -> 'a' -> 'b'
        const allDependencies: CaseInsensitiveMap<DependencyDetails> = new CaseInsensitiveMap();
        allDependencies.set('a', { _id: 'a', _version: '1.0.0' });
        allDependencies.set('b', { _id: 'b', _version: '3.0.0' });
        const children: CaseInsensitiveMap<string[]> = new CaseInsensitiveMap();
        children.set('parent', ['a']);
        children.set('a', ['b']);
        const dependencyTree: DependencyTree = new DependencyTree('parent', '2.0.0', allDependencies, children);

        // Check parent
        expect(dependencyTree.id).toBe('parent');
        expect(dependencyTree.version).toBe('2.0.0');
        expect(dependencyTree.dependencies.length).toBe(1);

        // Check dependency A
        const dependencyA: DependencyTree = dependencyTree.dependencies[0];
        expect(dependencyA.id).toBe('a');
        expect(dependencyA.version).toBe('1.0.0');
        expect(dependencyA.dependencies.length).toBe(1);

        // Check dependency B
        const dependencyB: DependencyTree = dependencyA.dependencies[0];
        expect(dependencyB.id).toBe('b');
        expect(dependencyB.version).toBe('3.0.0');
        expect(dependencyB.dependencies.length).toBe(0);
    });
});
