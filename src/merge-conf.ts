import { emptyObject, isObject, isString } from "./type-utils";
import { deepClone, getObjectKeys } from "./datum-utils";
import { UpdateCode, mergeScalarField, mergeVectorField } from "./merge-low";

export type DetailConfig = {
    [key: string]: UpdateCode | DetailConfig;
};

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
