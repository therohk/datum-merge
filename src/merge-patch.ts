import { emptyObject, isString } from "./type-utils";
import { createValueKeys, deepClone, getObjectKeys } from "./datum-utils";
import { asLodashPath, deepPatchLog } from "./patch-low";
import { UpdateCode, MergeCode } from "./merge-low";
import { DetailConfig, MergeConfig, detailMerge, fillUpdateCodes } from "./merge-conf";

export type MergeResult<T = any> = {
    path: string;
    op: "add" | "remove" | "replace";
    value?: Readonly<T>;
    prev?: Readonly<T>;
    code: MergeCode;
};

/**
 * merge structured data and return diff
 * @returns diff or false if no changes
 */
export function customMergePatch<T extends object>(
    target: T,
    source: Partial<T>,
    mergeConf: MergeConfig | MergeCode,
    excludeKeys?: string[],
): MergeResult[] | false {
    //implement externally
    switch (mergeConf) {
        case UpdateCode.C:
            return false; //diff is source
        case UpdateCode.T:
            return [];
        case UpdateCode.N:
            return false;
        case UpdateCode.Y:
            return bypassMergePatch(target, source);
    }
    // const blockUnset = !updateCodeInfo(mergeConf.scalar).unset;
    const mergeCodes = fillUpdateCodes(source, mergeConf, false, excludeKeys);
    if (emptyObject(mergeCodes)) {
        return false;
    }
    const targetBkp: T = deepClone(target);
    const changed = detailMerge(target, source, mergeCodes);
    const patch = deepMergeLog(targetBkp, target, mergeCodes);
    if (changed || patch?.length > 0) {
        return patch;
    }
    return false;
}

/**
 * bypass merge using direct assignment
 * @returns diff or false if no changes
 */
export function bypassMergePatch<T extends object>(
    target: T,
    source: Partial<T>,
): MergeResult[] | false {
    const sourceKeys = getObjectKeys(source ?? {});
    if (!source || !sourceKeys.length) {
        return false;
    }
    // const mergeConf = { scalar: UpdateCode.Y, vector: UpdateCode.Y, nested: UpdateCode.Y };
    // const mergeCodes = fillUpdateCodes(source, mergeConf, false, []);
    const mergeCodes: DetailConfig = createValueKeys(sourceKeys, UpdateCode.Y);
    const targetBkp: T = deepClone(target);
    // const patch = deepMergeLog(target, source, mergeCodes); //wrong diff
    Object.assign(target, { ...source }); //bypass logic
    const patch = deepMergeLog(targetBkp, target, mergeCodes);
    return !patch?.length ? false : patch;
}

//-----------------------------------------------------------------------------

/**
 * generate extended patch log for diff
 * can be used with filled merge config
 */
export function deepMergeLog(
    lhsObj: { [key: string]: any }, //before
    rhsObj: { [key: string]: any }, //after
    mergeCodes?: DetailConfig,
): MergeResult[] {
    const mergeLog = deepPatchLog(lhsObj, rhsObj, true, true) as MergeResult[];
    if (!mergeLog?.length) {
        return [];
    }
    const opCodeMap = {
        "add": UpdateCode.I,
        "replace": UpdateCode.H,
        "remove": UpdateCode.D,
        "test": UpdateCode.N,
    };
    for (const patchItem of mergeLog) {
        const pathParts: string[] = asLodashPath(patchItem.path);
        patchItem.code = !mergeCodes
            ? opCodeMap[patchItem.op]
            : selectPathCode(mergeCodes, pathParts);
        patchItem.path = pathParts.join(".");
    }
    return mergeLog;
};

/**
 * pick code applicable to current path
 */
export function selectPathCode(
    mergeCodes: DetailConfig,
    pathParts: string[],
): MergeCode {
    if (!mergeCodes || emptyObject(mergeCodes)) {
        return UpdateCode.N;
    }
    let currConf: DetailConfig = mergeCodes;
    for (let itr = 0; itr < pathParts.length; itr++) {
        const part = pathParts[itr];
        const partConf = currConf[part!];
        if (!partConf) {
            return UpdateCode.N;
        }
        if (isString(partConf)) {
            return partConf as MergeCode;
        }
        if (itr === pathParts.length - 1) {
            return UpdateCode.I;
        }
        //stop at vector index
        // if (integerString(part) && isString(currConf)) {
        //     return currConf;
        // }
        currConf = partConf;
    }
    return UpdateCode.N; //error
}
