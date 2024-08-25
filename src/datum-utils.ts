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

export function containsAny<T>(
    needles: T[],
    haystack: T[],
): boolean {
    if (!needles?.length || !haystack?.length) {
        return false;
    }
    return needles.some((i) => haystack.includes(i));
}

export function containsAll<T>(
    needles: T[],
    haystack: T[],
): boolean {
    if (!needles?.length || !haystack?.length) {
        return false;
    }
    return needles.every((i) => haystack.includes(i));
}

function arrayStartsWith<T>(arr: T[], base: T[]): boolean {
    for (let i = 0; i < base.length; i++) {
        if (arr[i] !== base[i]) {
            return false;
        }
    }
    return true;
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

function deleteEmptyKeys(obj: any): void {
    //modifies passed obj in place
    //removes empty properties and empty arrays
    return Object.keys(obj).forEach((k) => {
        if (!obj[k] || obj[k] === undefined
            || (Array.isArray(obj[k]) && obj[k].length === 0)) {
            delete obj[k];
        }
    });
}

//-----------------------------------------------------------------------------

function selectKeys(
    obj: any,
    excludeKeys: string[]
): any {
    //creates new object
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([k, _]) => !excludeKeys.includes(k))
    );
}

// function clonePartial<T>(obj: T, fields?: string[]): Partial<T> {
//     if (!obj) {
//         return obj;
//     }
//     fields = fields || Object.keys(obj);
//     return fields.reduce((clone, field) => {
//         clone[field] = deepClone(obj[field]);
//         return clone;
//     }, {} as Partial<T>);
// }

export function flattenObject(
    obj: { [key:string]: any }
): { [key:string]: any } {
    const flatten: { [key:string]: any } = {};
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

export function unflattenObject(
    flatObj: { [key:string]: any }
): { [key:string]: any } {
    const unFlatten: { [key:string]: any } = {};
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
