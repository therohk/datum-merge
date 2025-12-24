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
    if (partsLen === 1)
        return text === globParts[0];
    if (!text.startsWith(globParts[0]!))
        return false;
    let textIdx = globParts[0]!.length;
    for (let i = 1; i < partsLen - 1; i++) {
        const nextIdx = text.indexOf(globParts[i]!, textIdx);
        if (nextIdx < 0) {
            return false;
        }
        textIdx = nextIdx + globParts[i]!.length;
        continue;
    }
    if (!text.endsWith(globParts[partsLen - 1]!))
        return false;
    return true;
}

export function getGlobKeys(
    obj: any,
    inclPats: string[] = ["*"],
    exclPats?: string[],
): string[] {
    return Object.keys(obj)
        .filter((k) => !inclPats || inclPats.some((g) => fastGlobMatch(g, k)))
        .filter((k) => !exclPats?.length || !exclPats.some((g) => fastGlobMatch(g, k)));
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
