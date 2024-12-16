import { Diff, applyChange, diff, orderIndependentDiff } from "./diff-lib/deep-diff";
// import { Diff, applyChange, diff, orderIndependentDiff } from "deep-diff"; //old library
import { flattenObject, getObjectKeys } from "./datum-utils";
import { PatchResult, diffToPatchLog } from "./patch-low";

export function deepDiffFlat(
    oldFlat: any, //source
    newFlat: any, //target
    flatten: boolean = false,
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

export function deepDiffPatch(
    lhsObj: { [key: string]: any }, //target
    rhsObj: { [key: string]: any }, //source
    orderInd: boolean = false,
): PatchResult[] {
    const differences = deepDiffLow(lhsObj, rhsObj, orderInd);
    return !differences ? [] : diffToPatchLog(differences);
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
