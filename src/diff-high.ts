import { emptyObject } from "./type-utils";
import { Diff, applyChange, diff, orderIndependentDiff } from "./diff-lib/deep-diff";
// import { Diff, applyChange, diff, orderIndependentDiff } from "deep-diff"; //old library

/**
 * apply differences into blank tuple
 * deletes and indexes are not preserved
 */
export function deepDiffTyped<T extends object>(
    lhsObj: T, //target
    rhsObj: T, //source
    orderInd: boolean = false,
): Partial<T> {
    if (emptyObject(rhsObj)) {
        return {};
    }
    if (emptyObject(lhsObj)) {
        return { ...rhsObj };
    }
    const differences = deepDiffLow(lhsObj, rhsObj, orderInd);
    const deltaObj: Partial<T> = {};
    if (!differences) {
        return deltaObj;
    }
    for (const difference of differences) {
        applyChange(deltaObj, undefined, difference);
    }
    cleanupObjArrays(deltaObj);
    return deltaObj;
};

function cleanupObjArrays(obj: any): void {
    //remove empty items in array
    for (const objKey of Object.keys(obj)) {
        if (obj[objKey]?.filter) {
            obj[objKey] = obj[objKey].filter((e: any) => !!e);
        }
    }
}

/**
 * pick common values into blank tuple
 * only considers changes for top level keys
 */
export function antiDiffTyped<T extends object>(
    lhsObj: T,
    rhsObj: object,
    orderInd: boolean = false,
): Partial<T> {
    if (emptyObject(lhsObj) || emptyObject(rhsObj)) {
        return {};
    }
    const differences = deepDiffLow(lhsObj, rhsObj, orderInd);
    if (!differences) {
        return { ...lhsObj };
    }
    //find shallow changes
    const modFields: Set<string> = new Set<string>();
    differences.map((d) => d?.path)
        .filter((p) => !!p && p.length > 0)
        .map((p) => (p?.[0] as PropertyKey).toString())
        .forEach((s) => modFields.add(s));
    //keep unchanged keys
    const shareObj = Object.fromEntries<unknown>(
        Object.entries(lhsObj)
            .filter(([k, _]) => !modFields.has(k))
    ) as Partial<T>;
    return shareObj;
}

export function deepDiffLow<T = any, S = T>(
    lhsObj: T,
    rhsObj: S,
    orderInd: boolean = false,
): readonly Diff<T, S>[] | false {
    const differences = !orderInd
        ? diff(lhsObj, rhsObj)
        : orderIndependentDiff(lhsObj, rhsObj);
    return !differences?.length
        ? false
        : differences;
};

//-----------------------------------------------------------------------------

export function deepDiffFlat(
    oldFlat: any, //source
    newFlat: any, //target
    flatten: boolean = true,
): [any, any] {
    if (flatten) {
        oldFlat = flattenObject(oldFlat);
        newFlat = flattenObject(newFlat);
    }
    const updated = Object.assign({}, oldFlat);
    const removed = Object.assign({}, newFlat);
    //delete the unchanged keys
    for (const key of Object.keys(newFlat)) {
        if (newFlat[key] === oldFlat[key]) {
            delete updated[key];
            delete removed[key];
        }
    }
    return [updated, removed];
}

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
        const parts = path.split('.');
        let obj = unflatObj;
        for (const [i, key] of parts.slice(0, -1).entries()) {
            if (!obj[key]) {
                const needArray = Number.isInteger(Number(parts[+i + 1]));
                obj[key] = needArray ? [] : {};
            }
            obj = obj[key];
        }
        const lastkey = parts.pop();
        obj[lastkey!] = value;
    }
    return unflatObj;
}
