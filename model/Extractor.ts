import { DependencyInt } from './DependencyInt';

export interface Extractor {
    // Get all the dependencies for the project
    allDependencies(): Map<string, DependencyInt>;
    // Get all the root dependencies of the project
    directDependencies(): string[];
    // Dependencies relations map
    childrenMap(): Map<string, string[]>;
}
