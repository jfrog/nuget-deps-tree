/**
 * This map is used to store keys in a case insensitive manner.
 * Values remain untouched.
 */
export class CaseInsensitiveMap<V> extends Map<string, V> {
    set(key: string, value: V) {
        return super.set(key.toLocaleLowerCase(), value);
    }

    get(key: string): V | undefined {
        return super.get(key.toLocaleLowerCase());
    }
}
