import { isArrayOfAny, emptyObject, isNullish, isObject, isString, TupleObj } from "./type-utils";
import { createGlobRegex, deepClone, getObjectKeys } from "./datum-utils";
import { deepDiffTyped } from "./diff-high";
import { UpdateCode, mergeScalarField, mergeVectorField } from "./merge-low";
import { updateCodeInfo } from "./merge-high";

export type DetailConfig = {
    [key: string]: UpdateCode | DetailConfig;
};

export type MergeConfig = {
    scalar?: UpdateCode, //default
    vector?: UpdateCode, //array types
    nested?: UpdateCode, //object types 
    [glob: string]: UpdateCode | MergeConfig | undefined,
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
            if ((isObject(target[label]) && isObject(source[label]))
                ? detailMerge(target[label], source[label], mergeCode)
                : mergeScalarField(target, source, label, UpdateCode.I)
            ) {
                changed = true;
            }
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
export function selectDetailKeys(
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
export function customMerge<T extends TupleObj>(
    target: T,
    source: Partial<T>,
    mergeConf: MergeConfig | UpdateCode,
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
            const delta = deepDiffTyped<Partial<T>>(target, source);
            Object.assign(target, { ...source }); //bypass logic
            return delta;
    }
    const mergeCodes = fillUpdateCodes(source, mergeConf, excludeKeys, false);
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
 * creates a label to code mapping for source keys
 * must be invoked before every detail merge
 * @param source immutable incoming object for merge
 * @param mergeConf merge strategy config for type
 * @param excludeKeys exclude specific keys from merge
 * @param blockUnset exclude nullish keys in source
 * @returns codes for every source key
 */
export const fillUpdateCodes = (
    source: any,
    mergeConf: MergeConfig | UpdateCode,
    excludeKeys?: string[],
    blockUnset: boolean = false,
): DetailConfig => {
    if (isString(mergeConf)) {
        mergeConf = { scalar: mergeConf };
    }
    const globKeys: string[] = getObjectKeys(mergeConf)
        .filter((s) => s.includes("*"));
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
        //prefer exact key
        if (isString(labelConf)) {
            mergeCodes[srcLabel] = labelConf;
            continue;
        }
        //force skip empty vals
        if (isNullish(srcValue)) {
            mergeCodes[srcLabel] = blockUnset ? UpdateCode.N : UpdateCode.D;
            continue;
        }
        //handle nesting
        if (isObject(labelConf) && isObject(srcValue)) {
            mergeCodes[srcLabel] = fillUpdateCodes(srcValue, labelConf, [], blockUnset);
            continue;
        }
        //handle globs
        const globIndex = globPats.findIndex((r) => r.test(srcLabel));
        if (globIndex >= 0) {
            const globConf = mergeConf[globKeys[globIndex]!];
            if (isString(globConf)) {
                mergeCodes[srcLabel] = globConf as UpdateCode;
                continue;
            } else if (isObject(srcValue)) {
                mergeCodes[srcLabel] = fillUpdateCodes(srcValue, globConf!, [], blockUnset);
                continue;
            }
        }
        //fallback cases
        if (isObject(srcValue)) {
            mergeCodes[srcLabel] = mergeConf?.nested ?? UpdateCode.N;
        } else if (isArrayOfAny(srcValue)) {
            mergeCodes[srcLabel] = mergeConf?.vector ?? UpdateCode.XS;
        } else {
            mergeCodes[srcLabel] = mergeConf?.scalar ?? UpdateCode.B;
        }
    }
    //only exact labels for merge
    if (getObjectKeys(mergeCodes).length !== sourceKeys.length) {
        throw new Error("illegal merge config state");
    }
    return mergeCodes;
}

/**
 * custom merge but into a clone of target
 * @returns new object with merged result
 */
export function immutableCustomMerge(
    target: any,
    source: any,
    mergeConf: MergeConfig,
    skipFill?: boolean,
): any {
    const mergeCodes = skipFill
        ? mergeConf as DetailConfig
        : fillUpdateCodes(source, mergeConf);
    const targetCopy = deepClone(target);
    detailMerge(targetCopy, source, mergeCodes);
    return targetCopy;
}
