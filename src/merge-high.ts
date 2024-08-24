import { emptyObject, isString, isVectorArray } from "./type-utils";
import { deepClone, getObjectKeys } from "./data-utils";
import { UpdateCode, mergeScalarField, mergeVectorField } from "./merge-low";
import { deepDiffTyped } from "./diff-high";

export type MergeTypes = string[] | number[] | string | number | boolean;
// export type MergeTypes = Primitive | VectorArray;
export type MergeSafeTuple = { [label: string]: MergeTypes };
export type MergeTuple = { [label: string]: any };
export type MergeCode = `${UpdateCode}`;

export type DetailConfig = { 
    [path: string]: UpdateCode; 
};

export class MergeError extends Error {
    readonly code = 500;
    constructor(readonly data: {
        e: string,  //error message
        n?: string, //error name
        s: any,     //source
        v?: string, //container
        t?: any,    //target
    }) {
        super(data.e);
        this.name = data.n ?? 'MergeError';
    }
}

export function updateCodeInfo(
    mergeCode: UpdateCode
): {
    insert?: boolean,
    update?: boolean,
    unset?: boolean,
    enable: boolean,
} {
    if (!isString(mergeCode)) {
        return { enable: false };
    }
    const allowUnset = [
        UpdateCode.Y, UpdateCode.D, UpdateCode.U,
        UpdateCode.XR, UpdateCode.XD, UpdateCode.XI]
        .includes(mergeCode);
    const allowInsert = [
        UpdateCode.Y, UpdateCode.I, UpdateCode.B,
        UpdateCode.XR, UpdateCode.XM, UpdateCode.XS, UpdateCode.XF]
        .includes(mergeCode);
    const allowUpdate = [
        UpdateCode.Y, UpdateCode.H, UpdateCode.U, UpdateCode.B]
        .includes(mergeCode)
        || mergeCode.startsWith("X");
    return {
        insert: allowInsert,
        update: allowUpdate,
        unset: allowUnset,
        enable: allowInsert || allowUpdate || allowUnset,
    };
}

//-----------------------------------------------------------------------------

/**
 * merges every path present in given config
 * C, T not supported here 
 * @returns if target was changed
 */
export function detailMerge(
    target: { [key: string]: any },
    source: { [key: string]: any },
    mergeCodes: DetailConfig,
): boolean {
    const mergeKeys = getObjectKeys(mergeCodes);
    let changed = false;
    for (const label of mergeKeys) {
        const mergeCode = mergeCodes[label]!;
        if (mergeCode.toString().startsWith("X")
            ? mergeVectorField(target, source, label, mergeCode)
            : mergeScalarField(target, source, label, mergeCode)
        ) {
            changed = true;
        }
    }
    return changed;
}

//-----------------------------------------------------------------------------

/**
 * merges every top-level key present in source
 * C, T not supported here 
 * @returns if target was changed
 */
export function shallowMerge(
    target: any,
    source: any,
    scalarCode: UpdateCode,
    vectorCode?: UpdateCode,
    excludeKeys?: string[],
    includeKeys?: string[], //for delete
): boolean {
    const sourceKeys = getObjectKeys(source, excludeKeys, includeKeys);
    if (!sourceKeys?.length) {
        return false;
    }
    let changed = false;
    for (const label of sourceKeys) {
        // if (isArrayOfAny(target[label]) || isArrayOfAny(source[label])) {
        if (isVectorArray(target[label]) || isVectorArray(source[label])) {
            //fails if target is not array
            if (mergeVectorField(target, source, label, vectorCode ?? scalarCode)) {
                changed = true;
            }
            continue;
        }
        if (mergeScalarField(target, source, label, scalarCode))
            changed = true;
    }
    return changed;
}

/**
 * shallow merge but into a clone of target
 * @returns new object with merged result
 */
export function immutableMerge(
    target: any,
    source: any,
    scalarCode: UpdateCode,
    vectorCode?: UpdateCode,
): any {
    const targetCopy = deepClone(target);
    shallowMerge(targetCopy, source, scalarCode, vectorCode);
    return targetCopy;
};

/**
 * simulated diff generated by shallow merge
 * target object is not modified
 * @returns diff or false
 */
export function diffFromMerge(
    target: any,
    source: any,
    scalarCode: UpdateCode,
    vectorCode?: UpdateCode,
): any | false {
    const targetCopy = immutableMerge(target, source, scalarCode, vectorCode);
    const delta = deepDiffTyped(target, targetCopy);
    return emptyObject(delta) ? false : delta;
}
