import { cloneDeep, get } from "lodash-es";
import equal from 'fast-deep-equal';

export function getObjectKeys(
    obj: any,
    excludeKeys?: string[],
    includeKeys?: string[],
): string[] {
    if (!obj) {
        return [];
    }
    let sourceKeys = Object.keys(obj);
    if (includeKeys && !!includeKeys.length) {
        includeKeys.filter((k) => !sourceKeys.includes(k))
            .forEach((k) => sourceKeys.push(k)); //no dupes
    }
    if (excludeKeys && !!excludeKeys.length) {
        sourceKeys = sourceKeys.filter((k) => !excludeKeys.includes(k));
    }
    return sourceKeys;
};

export function createValueKeys<T>(
    keys: string[],
    value: T,
): { [key: string]: T } {
    return Object.fromEntries(keys.map((k) => [k, value]));
}

export function deepEquals(lhs: any, rhs: any): boolean {
    if (lhs === rhs)
        return true;
    return equal(lhs, rhs);
}

export function deepEqualsPath(lhs: any, rhs: any, atPath: string): boolean {
    return equal(get(lhs, atPath), get(rhs, atPath));
}

export function deepClone<T = any>(val: T): T {
    return cloneDeep(val);
}

export function toUniqueArray<T>(arr: T[]): T[] {
    return [...new Set<T>(arr)];
}

export function areArraysEqual<T>(
    arr1: T[] | undefined,
    arr2: T[] | undefined,
): boolean {
    if (arr1 == null && arr2 == null)
        return true;
    if (arr1 == null || arr2 == null)
        return false;
    if (arr1.length !== arr2.length)
        return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

//-----------------------------------------------------------------------------

export function createGlobRegex(
    search: string
): RegExp {
    const pattern = search.replace(/\*/g, ".+");
    //pattern = pattern.replace(/\?/g, ".");
    return new RegExp(`^${pattern}$`);
}

export function getGlobKeys(
    obj: any,
    includePats: string[] = ["*"], //globs or labels
    excludeKeys?: string[],        //labels only
): string[] {
    const includeKeys: string[] = [];
    if (!obj || !includePats?.length) {
        return includeKeys;
    }
    const labels: string[] = getObjectKeys(obj, excludeKeys);
    if (!labels || !labels.length) {
        return includeKeys;
    }
    const globPats = includePats.filter((s) => s.includes("*"))
        .map((g) => createGlobRegex(g));
    for (const label of labels) {
        if (includePats.includes(label)) {
            includeKeys.push(label);
        } else if (globPats.findIndex((r) => r.test(label)) >= 0) {
            includeKeys.push(label);
        }
    }
    return includeKeys;
}

export function selectObjKeys<T extends object>(
    obj: T,
    includeKeys: string[],
): Partial<T> {
    if (!includeKeys?.length)
        return { ...obj };
    return Object.fromEntries(Object.entries(obj)
        .filter(([k, _]) => includeKeys.includes(k))
    ) as Partial<T>;
}
