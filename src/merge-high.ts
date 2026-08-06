import { isArrayOfAny, emptyObject, isObject, isString } from "./type-utils";
import { deepClone, getObjectKeys, selectObjKeys } from "./datum-utils";
import { MergeCode, UpdateCode, mergeScalarField, mergeVectorField } from "./merge-low";
import { deepDiffTyped } from "./diff-high";
import { PatchResult, deepPatchLog } from "./patch-low";

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
        UpdateCode.Y, UpdateCode.F,
        UpdateCode.D, UpdateCode.U,
        UpdateCode.XR, UpdateCode.XD, UpdateCode.XI] as string[]
    ).includes(mergeCode);
    const allowInsert = ([
        UpdateCode.Y, UpdateCode.F,
        UpdateCode.I, UpdateCode.B,
        UpdateCode.XR, UpdateCode.XM, UpdateCode.XS, UpdateCode.XF] as string[]
    ).includes(mergeCode);
    const allowUpdate = ([
        UpdateCode.Y, UpdateCode.F,
        UpdateCode.H, UpdateCode.U, UpdateCode.B,
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
            if (mergeVectorField(target, source, label, vectorCode ?? scalarCode)) {
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
            //fails if target is not array
            changed = mergeVectorField(target, source, label, vectorCode) || changed;
            continue;
        }
        if (!isObject(target[label]) && !isObject(source[label])) {
            changed = mergeScalarField(target, source, label, scalarCode) || changed;
            continue;
        }
        if (nestedCode === UpdateCode.N) {
            continue;
        }
        if (nestedCode === UpdateCode.Y) {
            //enable and treat as scalar
            changed = mergeScalarField(target, source, label, scalarCode) || changed;
            continue;
        }
        //recursive call for objects
        if (isObject(target[label]) && isObject(source[label])) {
            changed = deepMerge(target[label], source[label],
                nestedCode.startsWith("X") ? scalarCode : nestedCode,
                nestedCode.startsWith("X") ? nestedCode : vectorCode,
                nestedCode
            ) || changed;
            continue;
        }
        //nest for empty target
        changed = (nestedCode.startsWith("X")
            ? mergeVectorField(target, source, label, nestedCode)
            : mergeScalarField(target, source, label, nestedCode)
        ) || changed;
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

/**
 * simulate diff generated by deep merge
 * target object is not modified
 * deletes are lost in the delta object
 * @returns diff or false if no changes
 */
export function diffFromMerge(
    target: { [key: string]: any },
    source: { [key: string]: any },
    scalarCode: MergeCode,
    vectorCode?: MergeCode,
    nestedCode?: MergeCode,
    orderInd: boolean = false,
): any | false {
    const targetCopy = immutableDeepMerge(target, source, scalarCode, vectorCode, nestedCode);
    const delta = deepDiffTyped(target, targetCopy, orderInd);
    return emptyObject(delta) ? false : delta;
}

/**
 * simulate patch generated by deep merge
 * target object is not modified
 * @returns patch array or false if no changes
 */
export function patchFromMerge(
    target: { [key: string]: any },
    source: { [key: string]: any },
    scalarCode: MergeCode,
    vectorCode?: MergeCode,
    nestedCode?: MergeCode,
    orderInd: boolean = false,
): PatchResult[] | false {
    const targetCopy = immutableDeepMerge(target, source, scalarCode, vectorCode, nestedCode);
    const patch = deepPatchLog(target, targetCopy, orderInd, true);
    return !patch?.length ? false : patch;
}

/**
 * bypass merge using direct assignment
 * behaves like shallow merge with code Y
 * @returns diff or false if no changes
 */
export function bypassMergeDiff<T extends object>(
    target: T,
    source: object,
    orderInd: boolean = true,
): Partial<T> | false {
    if (emptyObject(source)) {
        return false;
    }
    let delta = deepDiffTyped<T>(target, source as T, orderInd);
    Object.assign(target, { ...source }); //bypass logic
    //only source fields in diff
    delta = selectObjKeys(delta, getObjectKeys(source));
    return emptyObject(delta) ? false : delta;
}
