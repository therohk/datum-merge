import { cloneDeep } from "lodash-es";
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

export function deepEquals(lhs: any, rhs: any): boolean {
    return equal(lhs, rhs);
}

export function deepClone(val: any): any {
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
    let pattern = search.replace(/\*/g, ".+");
    //pattern = search.replace(/\?/g, ".");
    return new RegExp(`^${pattern}$`);
}

export function selectGlobKeys(
    obj: any,
    includePats: string[] = ["*"], //globs or labels
    excludeKeys?: string[],        //labels only
): string[] {
    const includeKeys: string[] = [];
    if (!obj || !includePats?.length) {
        return includeKeys;
    }
    const globPats = includePats.map((g) => createGlobRegex(g));
    for (const label of getObjectKeys(obj, excludeKeys)) {
        if (globPats.findIndex((r) => r.test(label)) >= 0) {
            includeKeys.push(label);
        }
    }
    return includeKeys;
}

//-----------------------------------------------------------------------------

export function flattenObject(
    obj: { [key: string]: any }
): { [key: string]: any } {
    const flatObj: { [key: string]: any } = {};
    const path: any[] = [];
    const isObject = (value: any) => Object(value) === value;
    function dig(obj: any) {
        for (const [key, value] of Object.entries(obj)) {
            path.push(key);
            if (isObject(value)) {
                dig(value);
            } else {
                flatObj[path.join('.')] = value;
            }
            path.pop();
        }
    }
    dig(obj);
    return flatObj;
}

export function unflattenObject(
    flatObj: { [key: string]: any }
): { [key: string]: any } {
    const unflatObj: { [key: string]: any } = {};
    for (const [path, value] of Object.entries(flatObj)) {
        const chain = path.split('.');
        let obj = unflatObj;
        for (const [i, key] of chain.slice(0, -1).entries()) {
            if (!obj[key]) {
                const needArray = Number.isInteger(Number(chain[+i + 1]));
                obj[key] = needArray ? [] : {};
            }
            obj = obj[key];
        }
        const lastkey = chain.pop();
        obj[lastkey!] = value;
    }
    return unflatObj;
}
