import { isArrayOfAny, emptyObject, isNullish, isObject, isString } from "./type-utils";
import { createGlobRegex, deepClone, getObjectKeys, selectObjKeys } from "./datum-utils";
import { deepDiffTyped } from "./diff-high";
import { UpdateCode, MergeCode, mergeScalarField, mergeVectorField } from "./merge-low";
import { updateCodeInfo } from "./merge-high";

export type DetailConfig = {
    [key: string]: MergeCode | DetailConfig;
};

export type MergeConfig = {
    scalar?: MergeCode; //default
    vector?: MergeCode; //array types
    nested?: MergeCode; //object types
    [glob: string]: MergeCode | MergeConfig | undefined;
};

//-----------------------------------------------------------------------------

/**
 * merges every key present in given config
 * recursive call if nested config is present
 * C, T not supported here
 * @returns if target was changed
 */
export function detailMerge(
    target: { [key: string]: any },
    source: { [key: string]: any },
    mergeCodes: DetailConfig,
): boolean {
    if (!isObject(mergeCodes) || emptyObject(mergeCodes)) {
        return false;
    }
    let changed = false;
    const mergeKeys = getObjectKeys(mergeCodes);
    for (const label of mergeKeys) {
        const mergeCode = mergeCodes[label]!;
        if (!isString(mergeCode)) {
            if (isObject(target[label]) && isObject(source[label])) {
                changed = detailMerge(target[label], source[label], mergeCode) || changed;
                continue;
            }
            if (!isObject(target[label]) && isObject(source[label])) {
                const targetVal = {};
                detailMerge(targetVal, source[label], mergeCode);
                //type mismatch failure if exists
                changed = mergeScalarField(target, { [label]: targetVal }, label, UpdateCode.I) || changed;
                continue;
            }
            //bad config scenario
            changed = mergeScalarField(target, source, label, UpdateCode.I) || changed;
            continue;
        }
        if (mergeCode.toString().startsWith("X")
            ? mergeVectorField(target, source, label, mergeCode)
            : mergeScalarField(target, source, label, mergeCode)
        ) {
            changed = true;
        }
    }
    return changed;
}

/**
 * detail merge but into a clone of target
 * @returns new object with merged result
 */
export function immutableDetailMerge(
    target: any,
    source: any,
    mergeCodes: DetailConfig,
): any {
    const targetCopy = deepClone(target);
    detailMerge(targetCopy, source, mergeCodes);
    return targetCopy;
}

/**
 * @returns list of mergeable keys for given config
 */
export function getDetailKeys(
    obj: any,
    mergeCodes: DetailConfig,
    excludeKeys?: string[],
): string[] {
    const includeKeys: string[] = [];
    if (!obj || !mergeCodes) {
        return includeKeys;
    }
    for (const label of getObjectKeys(obj, excludeKeys)) {
        const labelConf = mergeCodes[label];
        if (isString(labelConf) && updateCodeInfo(labelConf).enable)
            includeKeys.push(label);
        if (isObject(labelConf) && !emptyObject(labelConf))
            includeKeys.push(label);
    }
    return includeKeys;
}

//-----------------------------------------------------------------------------

/**
 * merge structured data and return diff
 * @returns diff or false if no changes
 */
export function customMerge<T extends object>(
    target: T,
    source: Partial<T>,
    mergeConf: MergeConfig | MergeCode,
    excludeKeys?: string[],
): Partial<T> | false {
    //implement externally
    switch (mergeConf) {
        case UpdateCode.C:
            return false; //diff is source
        case UpdateCode.T:
            return {};
        case UpdateCode.N:
            return false;
        case UpdateCode.Y:
            return bypassMerge(target, source);
    }
    const mergeCodes = fillUpdateCodes(source, mergeConf, false, excludeKeys);
    if (emptyObject(mergeCodes)) {
        return false;
    }
    const targetBkp: T = deepClone(target);
    const changed = detailMerge(target, source, mergeCodes);
    const delta = deepDiffTyped<T>(targetBkp, target, true);
    if (changed || !emptyObject(delta)) {
        return delta;
    }
    return false;
}

/**
 * bypass merge using direct assignment
 * behaves like shallow merge with code Y
 * @returns diff or false if no changes
 */
export function bypassMerge<T extends object>(
    target: T,
    source: object,
): Partial<T> | false {
    if (emptyObject(source)) {
        return false;
    }
    let delta = deepDiffTyped<T>(target, source as T, true);
    Object.assign(target, { ...source }); //bypass logic
    //only source fields in diff
    delta = selectObjKeys(delta, getObjectKeys(source));
    return emptyObject(delta) ? false : delta;
}

/**
 * custom merge but into a clone of target
 * @returns new object with merged result
 */
export function immutableCustomMerge(
    target: any,
    source: any,
    mergeConf: MergeConfig,
    skipFill: boolean = false,
): any {
    const mergeCodes = !skipFill
        ? fillUpdateCodes(source, mergeConf)
        : mergeConf as DetailConfig;
    const targetCopy = deepClone(target);
    detailMerge(targetCopy, source, mergeCodes);
    return targetCopy;
}

/**
 * creates a label to code mapping for source keys
 * must be invoked before every detail merge
 * @param source immutable incoming object for merge
 * @param mergeConf merge strategy config for type
 * @param blockUnset exclude nullish keys in source
 * @param excludeKeys exclude specific keys from merge
 * @returns codes for every source key
 */
export const fillUpdateCodes = (
    source: any,
    mergeConf: MergeConfig | MergeCode,
    blockUnset: boolean = false,
    excludeKeys?: string[],
): DetailConfig => {
    if (isString(mergeConf)) {
        mergeConf = { scalar: mergeConf };
    }
    const deepConf = {
        scalar: mergeConf?.scalar || UpdateCode.B,
        vector: mergeConf?.vector || UpdateCode.XS,
        nested: mergeConf?.nested || UpdateCode.N,
    };
    const globKeys: string[] = getObjectKeys(mergeConf)
        .filter((s) => s.includes("*"))
        .sort((s1, s2) => s2.length - s1.length); //prefer longest
    const globPats: RegExp[] = globKeys.map((g) => createGlobRegex(g));

    //iterate keys in source
    const mergeCodes: DetailConfig = {};
    const sourceKeys: string[] = getObjectKeys(source);
    for (const srcLabel of sourceKeys) {
        const srcValue: any = source[srcLabel];
        const labelConf = mergeConf?.[srcLabel];
        //remove exclusions first
        if (excludeKeys?.includes(srcLabel)) {
            mergeCodes[srcLabel] = UpdateCode.N;
            continue;
        }
        //force skip empty vals
        if (isNullish(srcValue) && blockUnset) {
            mergeCodes[srcLabel] = UpdateCode.N;
            continue;
        }
        //prefer exact key
        if (isString(labelConf)) {
            mergeCodes[srcLabel] = labelConf;
            continue;
        }
        //handle nesting
        if (isObject(labelConf) && isObject(srcValue)) {
            mergeCodes[srcLabel] = fillUpdateCodes(srcValue, { ...deepConf, ...labelConf }, blockUnset);
            //todo nested deletes ignored
            continue;
        }
        //handle globs
        const globIndex = globPats.findIndex((r) => r.test(srcLabel));
        if (globIndex >= 0) {
            const globConf = mergeConf[globKeys[globIndex]!];
            if (isString(globConf)) {
                mergeCodes[srcLabel] = globConf as MergeCode;
                continue;
            }
            if (isObject(globConf) && isObject(srcValue)) {
                mergeCodes[srcLabel] = fillUpdateCodes(srcValue, { ...deepConf, ...globConf! }, blockUnset);
                continue;
            }
        }
        //fallback cases
        if (isObject(srcValue)) {
            mergeCodes[srcLabel] = deepConf.nested;
        } else if (isArrayOfAny(srcValue)) {
            mergeCodes[srcLabel] = deepConf.vector;
        } else {
            mergeCodes[srcLabel] = deepConf.scalar;
        }
    }
    //only exact labels for merge
    if (getObjectKeys(mergeCodes).length !== sourceKeys.length) {
        throw new Error("illegal merge config state");
    }
    return mergeCodes;
}
