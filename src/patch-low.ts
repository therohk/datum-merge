import { get, set, toPath, unset } from "lodash-es";
import { Diff } from "./diff-lib/deep-diff";
import { deepDiffLow } from "./diff-high";

export type PatchResult<T = any> = {
    path: string;
    op: "add" | "remove" | "replace";
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
 * reapply patch on a fresh target
 */
export function applyPatchLog(
    patchLog: PatchResult[],
    target: object = {},
): object {
    if (!patchLog)
        return target;
    for (const patchItem of patchLog) {
        const difPath: string[] = asLodashPath(patchItem.path);
        if (patchItem.op === "remove") {
            unset(target, difPath);
        } else {
            set(target, difPath, patchItem.value);
        }
    }
    return target;
}

/**
 * revert changes on the previous target
 */
export function revertPatchLog(
    patchLog: PatchResult[],
    target: object,
): object {
    if (!patchLog)
        return target;
    for (const patchItem of patchLog) {
        const difPath: string[] = asLodashPath(patchItem.path);
        if (patchItem.op === "add") {
            unset(target, difPath);
        } else {
            set(target, difPath, patchItem.prev);
        }
    }
    return target;
}

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

export function getValueByPointer(document: any, pointer: string): any {
    return pointer === "" ? document
        : get(document, asLodashPath(pointer));
}
