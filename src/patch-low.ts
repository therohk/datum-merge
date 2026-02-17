import { get, set, toPath, unset } from "lodash-es";
import { isNullish, isPrimitive } from "./type-utils";
import { deepClone, deepEquals } from "./datum-utils";
import { Diff } from "./diff-lib/deep-diff";
import { deepDiffLow } from "./diff-high";

export type PatchResult<T = any> = {
    path: string;
    op: "add" | "remove" | "replace" | "test";
    value?: Readonly<T>;
    prev?: any;
};

/**
 * convert deep diff to json patch model
 * only requires add/replace/remove operations
 * can be used with the result of any diff
 */
export function diffToPatchLog(
    differences: readonly Diff<any, any>[],
    storePrev: boolean = false,
): PatchResult[] {
    const jsonPatch: PatchResult[] = [];
    for (const dif of differences) {
        let pointer = asJsonPointer(dif.path ?? []);
        switch (dif.kind) {
            case "N":
                jsonPatch.push({ op: "add", path: pointer, value: dif.rhs });
                break;
            case "E":
                jsonPatch.push({ op: "replace", path: pointer, value: dif.rhs, prev: dif.lhs });
                break;
            case "D":
                jsonPatch.push({ op: "remove", path: pointer, prev: dif.lhs });
                break;
            case "A":
                pointer = `${pointer}/${dif.index}`;
                if (dif.item?.kind === 'N') {
                    jsonPatch.push({ op: "add", path: pointer, value: dif.item.rhs });
                }
                if (dif.item?.kind === 'D') {
                    jsonPatch.push({ op: "remove", path: pointer, prev: dif.item.lhs });
                }
                break;
        }
    }
    if (!storePrev) {
        jsonPatch.forEach((p) => delete p.prev);
    }
    return jsonPatch;
}

export function deepPatchLog(
    lhsObj: { [key: string]: any }, //before
    rhsObj: { [key: string]: any }, //after
    orderInd: boolean = false,
    storePrev: boolean = false,
): PatchResult[] {
    const differences = deepDiffLow(lhsObj, rhsObj, orderInd);
    return !differences ? [] : diffToPatchLog(differences, storePrev);
};

/**
 * subset of standard json patch format
 * reapply patch on a fresh target
 */
export function applyPatchLog(
    patchLog: PatchResult[],
    target: object,
): boolean {
    if (!target || !patchLog?.length)
        return false;
    let changed = false;
    for (const patchItem of patchLog) {
        const difPath: string[] = asLodashPath(patchItem.path);
        if (patchItem.op === "test")
            continue;
        if (patchItem.op === "remove") {
            changed = unset(target, difPath) || changed;
            continue;
        }
        const targetVal = get(target, difPath);
        const sourceVal = patchItem.value;
        if (isNullish(targetVal) && isNullish(sourceVal))
            continue;
        if (isNullish(targetVal) || !deepEquals(targetVal, sourceVal)) {
            set(target, difPath, deepClone(sourceVal));
            changed = true;
        }
    }
    return changed;
}

/**
 * revert changes on the previous target
 */
export function revertPatchLog(
    patchLog: PatchResult[],
    target: object,
): boolean {
    if (!target || !patchLog?.length)
        return false;
    let changed = false;
    for (const patchItem of patchLog) {
        const difPath: string[] = asLodashPath(patchItem.path);
        if (patchItem.op === "test")
            continue;
        if (patchItem.op === "add") {
            changed = unset(target, difPath) || changed;
            continue;
        }
        set(target, difPath, patchItem.prev);
        changed = true;
    }
    return changed;
}

/**
 * unofficial json merge-patch format 
 * op is ignored and nulls are removed
 */
export function forcePatchLog(
    patchLog: { path: string, value?: unknown }[],
    target: object = {},
): void {
    for (const patchItem of patchLog) {
        const difPath: string[] = patchItem.path.startsWith("/")
            ? asLodashPath(patchItem.path) : toPath(patchItem.path);
        if (!difPath?.length)
            continue;
        const value = patchItem.value;
        if (isNullish(value)) {
            unset(target, difPath);
        } if (isPrimitive(value)) {
            set(target, difPath, value);
        } else {
            set(target, difPath, deepClone(value));
        }
    }
}

export function immutablePatch(
    target: object,
    patchSrc: PatchResult[],
    patchDir?: "apply" | "revert" | "force",
): object {
    const targetCopy = deepClone(target ?? {});
    if (patchDir === "revert") {
        revertPatchLog(patchSrc, targetCopy);
    } else if (patchDir === "force") {
        forcePatchLog(patchSrc, targetCopy);
    } else {
        applyPatchLog(patchSrc, targetCopy);
    }
    return targetCopy;
};

//-----------------------------------------------------------------------------

function escapePathPart(path: PropertyKey): string {
    if (typeof path === 'number')
        return path.toString();
    if (typeof path === 'symbol')
        return path.toString();
    if (path.indexOf('/') === -1 && path.indexOf('~') === -1)
        return path;
    return path.replace(/~/g, '~0').replace(/\//g, '~1');
}

function unescapePathPart(path: string): string {
    return path.replace(/~1/g, '/').replace(/~0/g, '~');
}

function asJsonPointer(path: PropertyKey[]): string {
    return !path?.length ? ""
        : "/" + path.map((s) => escapePathPart(s)).join("/");
}

export function asLodashPath(pointer: string): string[] {
    if (!pointer || !pointer.startsWith("/"))
        return [];
    const parts: string[] = pointer.slice(1).split("/")
        .map((s) => unescapePathPart(s));
    return !parts?.length ? [] : toPath(parts.join("."));
}

export function getPointerValue(document: any, pointer: string): any {
    return pointer === "" ? document
        : get(document, asLodashPath(pointer));
}
