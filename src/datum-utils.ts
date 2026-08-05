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

export function isPlainObject(
    value: any,
): value is object { //obj is Datum
    if (typeof value !== 'object' || value === null)
        return false;
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto === Object.prototype;
}

export function createValueKeys<T>(
    keys: string[],
    value: T,
): { [key: string]: T } {
    return Object.fromEntries(keys.map((k) => [k, value]));
}

export function shallowEquals(lhs: any, rhs: any): boolean {
    return lhs === rhs;
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

export function fastGlobMatch(
    glob: string,
    text: string,
): boolean {
    if (!glob.includes("*"))
        return text === glob;
    if (glob === "*")
        return typeof text === "string";
    const globParts: string[] = glob.split(/\*+/g, -1);
    const partsLen = globParts.length;
    if (partsLen === 0)
        return !text;
    const prefix = globParts[0]!;
    if (partsLen === 1)
        return text === prefix;
    if (!text.startsWith(prefix))
        return false;
    let textIdx = prefix.length;
    for (let i = 1; i < partsLen - 1; i++) {
        const nextIdx = text.indexOf(globParts[i]!, textIdx);
        if (nextIdx < 0) {
            return false;
        }
        textIdx = nextIdx + globParts[i]!.length;
        continue;
    }
    const suffix = globParts[partsLen - 1]!;
    if (textIdx > text.length - suffix.length)
        return false;
    if (!text.endsWith(suffix))
        return false;
    return true;
}

export function getGlobKeys(
    obj: any,
    inclGlobs: string[] = ["*"],
    exclGlobs?: string[],
): string[] {
    return Object.keys(obj)
        .filter((k) => !inclGlobs || inclGlobs.some((g) => fastGlobMatch(g, k)))
        .filter((k) => !exclGlobs?.length || !exclGlobs.some((g) => fastGlobMatch(g, k)));
}

export function selectObjKeys<T extends object>(
    obj: T,
    inclKeys?: string[],
): Partial<T> {
    inclKeys = inclKeys || getObjectKeys(obj);
    return Object.fromEntries(Object.entries(obj)
        .filter(([k, _]) => inclKeys.includes(k))
    ) as Partial<T>; //shallow copy
}
