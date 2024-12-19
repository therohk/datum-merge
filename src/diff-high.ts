import { Diff, applyChange, diff, orderIndependentDiff } from "./diff-lib/deep-diff";
// import { Diff, applyChange, diff, orderIndependentDiff } from "deep-diff"; //old library
import { getObjectKeys } from "./datum-utils";

export function deepDiffTyped<T>(
    lhsObj: T, //target
    rhsObj: T, //source
    orderInd: boolean = false,
): Partial<T> {
    const differences = deepDiffLow(lhsObj, rhsObj, orderInd);
    const deltaObj: Partial<T> = {};
    if (!differences) {
        return deltaObj;
    }
    for (const difference of differences) {
        applyChange(deltaObj, null, difference);
    }
    //remove empty items in arrays
    for (const objKey of getObjectKeys(deltaObj)) {
        if (deltaObj[objKey]?.filter) {
            deltaObj[objKey] = deltaObj[objKey].filter((e: any) => !!e);
        }
    }
    return deltaObj;
};

export function deepDiffLow<T, S>(
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
