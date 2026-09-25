import { emptyObject, isArrayOfAny, isNullish } from "./type-utils";
import { getObjectKeys, isPlainObject } from "./datum-utils";
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
        .filter((p) => !isNullish(p) && p.length > 0)
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

function cleanupObjArrays(obj: any): void {
    //remove empty items in array
    for (const objKey of Object.keys(obj)) {
        if (obj[objKey]?.filter) {
            obj[objKey] = obj[objKey].filter((e: any) => !isNullish(e));
        }
    }
}

export function deepCompact(
    target: Record<string, any>,
    // delEmpty: boolean = false,
): boolean {
    let changed = false;
    for (const label of getObjectKeys(target)) {
        const value = target[label];
        if (isArrayOfAny(value)) {
            const prevLen = value.length;
            const compact = value.filter((v) => !isNullish(v));
            let deepChange = false;
            compact.forEach((v) => {
                deepChange = isPlainObject(v) ? deepCompact(v) : deepChange;
            });
            if (prevLen !== compact.length || deepChange) {
                target[label] = compact;
                changed = true;
            }
            continue;
        }
        if (isPlainObject(value)) {
            changed = deepCompact(value) || changed;
            continue;
        }
    }
    return changed;
}

export function deepDiffFlat(
    oldFlat: any, //target
    newFlat: any, //source
    flatten: boolean = true,
): [any, any] {
    //parallel path for tests only
    if (flatten) {
        oldFlat = flattenObject(oldFlat);
        newFlat = flattenObject(newFlat);
    }
    const removed = Object.assign({}, oldFlat);
    const updated = Object.assign({}, newFlat);
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
    obj: Record<string, any>
): Record<string, any> {
    const flatObj: Record<string, any> = {};
    const parts: string[] = [];
    function dfs(obj: any): void {
        for (const [label, value] of Object.entries(obj)) {
            parts.push(label);
            if (Object(value) === value) {
                dfs(value);
            } else {
                flatObj[parts.join('.')] = value;
            }
            parts.pop();
        }
    }
    dfs(obj);
    return flatObj;
}

export function unflattenObject(
    flatObj: Record<string, any>
): Record<string, any> {
    const unflatObj: Record<string, any> = {};
    for (const [path, value] of Object.entries(flatObj)) {
        const parts: string[] = path.split('.');
        let obj = unflatObj;
        for (const [d, label] of parts.slice(0, -1).entries()) {
            if (!obj[label]) {
                const needArray = Number.isInteger(Number(parts[+d + 1]));
                obj[label] = needArray ? [] : {};
            }
            obj = obj[label];
        }
        obj[parts.pop()!] = value;
    }
    return unflatObj;
}
