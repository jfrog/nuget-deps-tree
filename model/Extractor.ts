import { DependencyDetails } from './DependencyDetails';
import { CaseInsensitiveMap } from './CaseInsensitiveMap';

export interface Extractor {
    allDependencies(): CaseInsensitiveMap<DependencyDetails>;
    directDependencies(): string[];
    childrenMap(): CaseInsensitiveMap<string[]>;
}
