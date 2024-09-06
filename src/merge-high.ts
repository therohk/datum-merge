import { isArrayOfAny, emptyObject, isObject, isString } from "./type-utils";
import { deepClone, getObjectKeys } from "./datum-utils";
import { deepDiffTyped } from "./diff-high";
import { MergeCode, UpdateCode, mergeScalarField, mergeVectorField } from "./merge-low";

export type MergePerms = {
    enable: boolean;
    insert?: boolean;
    update?: boolean;
    unset?: boolean;
};

export function updateCodeInfo(
    mergeCode: MergeCode,
): MergePerms {
    if (!isString(mergeCode)) {
        return { enable: false };
    }
    const allowUnset = ([
        UpdateCode.Y, UpdateCode.D, UpdateCode.U,
        UpdateCode.XR, UpdateCode.XD, UpdateCode.XI] as string[]
    ).includes(mergeCode);
    const allowInsert = ([
        UpdateCode.Y, UpdateCode.I, UpdateCode.B,
        UpdateCode.XR, UpdateCode.XM, UpdateCode.XS, UpdateCode.XF] as string[]
    ).includes(mergeCode);
    const allowUpdate = ([
        UpdateCode.Y, UpdateCode.H, UpdateCode.U, UpdateCode.B,
        UpdateCode.XR, UpdateCode.XS, UpdateCode.XF,
        UpdateCode.XM, UpdateCode.XI, UpdateCode.XD] as string[]
    ).includes(mergeCode);
    return {
        insert: allowInsert,
        update: allowUpdate,
        unset: allowUnset,
        enable: allowInsert || allowUpdate || allowUnset,
    };
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
    scalarCode: MergeCode,
    vectorCode?: MergeCode,
    excludeKeys?: string[],
    includeKeys?: string[], //for delete
): boolean {
    const sourceKeys = getObjectKeys(source, excludeKeys, includeKeys);
    if (!sourceKeys?.length) {
        return false;
    }
    let changed = false;
    for (const label of sourceKeys) {
        if (isArrayOfAny(target[label]) || isArrayOfAny(source[label])) {
            //todo fails if target is not array
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
    scalarCode: MergeCode,
    vectorCode?: MergeCode,
): any {
    const targetCopy = deepClone(target);
    shallowMerge(targetCopy, source, scalarCode, vectorCode);
    return targetCopy;
};

/**
 * simulated diff generated by shallow merge
 * target object is not modified
 * @returns diff or false if no changes
 */
export function diffFromMerge(
    target: any,
    source: any,
    scalarCode: MergeCode,
    vectorCode?: MergeCode,
): any | false {
    const targetCopy = immutableMerge(target, source, scalarCode, vectorCode);
    const delta = deepDiffTyped(target, targetCopy);
    return emptyObject(delta) ? false : delta;
}

//-----------------------------------------------------------------------------

/**
 * recursively merges any unstructured datum
 * nesting can be disabled or treated as scalar
 * C, T not supported here
 * @returns if target was changed
 */
export function deepMerge(
    target: { [key: string]: any },
    source: { [key: string]: any },
    scalarCode: MergeCode,
    vectorCode: MergeCode,
    nestedCode: MergeCode,
): boolean {
    const sourceKeys = getObjectKeys(source);
    if (!sourceKeys?.length) {
        return false;
    }
    let changed = false;
    for (const label of sourceKeys) {
        if (isArrayOfAny(target[label]) || isArrayOfAny(source[label])) {
            if (mergeVectorField(target, source, label, vectorCode)) {
                changed = true;
            }
            continue;
        }
        //recursive call for objects
        //todo should nest for empty target
        if (isObject(target[label]) && isObject(source[label])) {
            if (nestedCode === UpdateCode.N)
                continue;
            if (nestedCode === UpdateCode.Y) {
                if (mergeScalarField(target, source, label, scalarCode))
                    changed = true;
                continue;
            }
            if (deepMerge(target[label], source[label],
                nestedCode.startsWith("X") ? scalarCode : nestedCode,
                nestedCode.startsWith("X") ? nestedCode : vectorCode,
                nestedCode
            )) {
                changed = true;
            }
            continue;
        }
        if (mergeScalarField(target, source, label, scalarCode)) {
            changed = true;
        }
    }
    return changed;
}

/**
 * deep merge but into a clone of target
 * @returns new object with merged result
 */
export function immutableDeepMerge(
    target: { [key: string]: any },
    source: { [key: string]: any },
    scalarCode: MergeCode,
    vectorCode?: MergeCode,
    nestedCode?: MergeCode,
): any {
    const targetCopy = deepClone(target);
    deepMerge(targetCopy, source,
        scalarCode,
        vectorCode ?? scalarCode,
        nestedCode ?? scalarCode,
    );
    return targetCopy;
};
