import { cloneDeep } from "lodash-es";
import equal from 'fast-deep-equal';

export function getObjectKeys(
    obj: any,
    excludeKeys?: string[],
    includeKeys?: string[], //for delete
): string[] {
    if (!obj) {
        return [];
    }
    let sourceKeys = Object.keys(obj);
    if (includeKeys && !!includeKeys.length) {
        //dont add duplicates
        includeKeys.filter((k) => !sourceKeys.includes(k))
            .forEach((k) => sourceKeys.push(k));
    }
    if (excludeKeys && !!excludeKeys.length) {
        sourceKeys = sourceKeys.filter((k) => !excludeKeys.includes(k));
    }
    return sourceKeys;
};

export function createGlobRegex(
    search: string
): RegExp {
    let pattern = search.replace(/\*/g, ".+");
    //pattern = search.replace(/\?/g, ".");
    return new RegExp(`^${pattern}$`);
}

export function deepEquals(lhs: any, rhs: any): boolean {
    return equal(lhs, rhs);
}

export function objToString(value: any): string {
    return JSON.stringify(value, null, 1);
    // return JSON.stringify(value);
}

export function deepClone(val: any): any {
    return cloneDeep(val);
}

//-----------------------------------------------------------------------------

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

export function flattenObject(obj: any): any {
    const flatten: { [key: string]: any } = {};
    const path: any[] = [];
    const isObject = (value: any) => Object(value) === value;
    function dig(obj: any) {
        for (const [key, value] of Object.entries(obj)) {
            path.push(key);
            if (isObject(value)) {
                dig(value);
            } else {
                flatten[path.join('.')] = value;
            }
            path.pop();
        }
    }
    dig(obj);
    return flatten;
}

export function unflattenObject(flatObj: any): any {
    const unFlatten: any = {};
    for (const [path, value] of Object.entries(flatObj)) {
        const chain = path.split('.');
        let object = unFlatten;
        for (const [i, key] of chain.slice(0, -1).entries()) {
            if (!object[key]) {
                const needArray = Number.isInteger(Number(chain[+i + 1]));
                object[key] = needArray ? [] : {};
            }
            object = object[key];
        }
        const lastkey = chain.pop();
        object[lastkey!] = value;
    }
    return unFlatten;
}
