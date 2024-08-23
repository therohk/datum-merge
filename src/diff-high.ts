import { Diff, applyChange, diff, orderIndependentDiff } from "deep-diff";
import { flattenObject, getObjectKeys } from "./data-utils";

export function deepDiffFlat(
    oldFlat: any, //source
    newFlat: any, //target
    flatten = false,
): [any, any] {
    if (flatten) {
        oldFlat = flattenObject(oldFlat);
        newFlat = flattenObject(newFlat);
    }
    const updated = Object.assign({}, oldFlat);
    const removed = Object.assign({}, newFlat);
    //delete the unUpdated keys
    for (let key of Object.keys(newFlat)) {
        if (newFlat[key] === oldFlat[key]) {
            delete updated[key];
            delete removed[key];
        }
    }
    return [updated, removed];
}

export function deepDiffTyped<T>(
    lhsObj: T,
    rhsObj: T,
): Partial<T> {
    const differences = deepDiffLow(lhsObj, rhsObj);
    const deltaObj: Partial<T> = {};
    if (!differences) {
        return deltaObj;
    }
    for (const difference of differences) {
        applyChange(deltaObj, null, difference);
    }
    cleanupObjArrays(deltaObj);
    return deltaObj;
};

function cleanupObjArrays(obj: any): void {
    //remove empty items in array
    for (const objKey of getObjectKeys(obj)) {
        if (obj[objKey]?.filter) {
            obj[objKey] = obj[objKey].filter((e: any) => !!e);
        }
    }
}

export function deepDiffLow<T, S>(
    lhsObj: T,
    rhsObj: S,
    orderInd: boolean = false,
): Diff<T, S>[] | false {
    const differences = !orderInd
        ? diff(lhsObj, rhsObj)
        : orderIndependentDiff(lhsObj, rhsObj);
    return !differences?.length
        ? false
        : differences;
};
