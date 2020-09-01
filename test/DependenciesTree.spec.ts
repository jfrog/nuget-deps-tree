import { DependencyInt } from '../model/DependencyInt';
import { DependenciesTree } from '../src/DependenciesTree/Tree';

describe('Dependencies Tree Tests', () => {
    test('Create dependencies tree', () => {
        // Create dependencies tree: 'parent' -> 'a' -> 'b'
        const allDependencies: Map<string, DependencyInt> = new Map();
        allDependencies.set('a', { _id: 'a' });
        allDependencies.set('b', { _id: 'b' });
        const children: Map<string, string[]> = new Map();
        children.set('parent', ['a']);
        children.set('a', ['b']);
        const dependenciesTree: DependenciesTree = new DependenciesTree(
            { _id: 'parent' },
            'parent',
            allDependencies,
            children
        );

        // Check parent
        expect(dependenciesTree.id).toBe('parent');
        expect(dependenciesTree.dependency).toStrictEqual({ _id: 'parent' });
        expect(dependenciesTree.directDependencies.length).toBe(1);

        // Check dependency A
        const dependencyA: DependenciesTree = dependenciesTree.directDependencies[0];
        expect(dependencyA.id).toBe('a');
        expect(dependencyA.dependency).toStrictEqual({ _id: 'a' });
        expect(dependencyA.directDependencies.length).toBe(1);

        // Check dependency B
        const dependencyB: DependenciesTree = dependencyA.directDependencies[0];
        expect(dependencyB.id).toBe('b');
        expect(dependencyB.dependency).toStrictEqual({ _id: 'b' });
        expect(dependencyB.directDependencies.length).toBe(0);
    });
});
