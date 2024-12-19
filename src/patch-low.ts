import { get, toPath } from "lodash-es";
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
 * can be used with any diff operation
 */
export function diffToPatchLog(
    differences: readonly Diff<any, any>[],
    storePrev: boolean = false,
): PatchResult[] {
    const jsonPatch: PatchResult[] = [];
    for (const dif of differences) {
        let pointer = asJsonPointer(dif.path);
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

//-----------------------------------------------------------------------------

function escapePathPart(path: string | number): string {
    if (typeof path === 'number')
        return path.toString();
    if (path.indexOf('/') === -1 && path.indexOf('~') === -1)
        return path;
    return path.replace(/~/g, '~0').replace(/\//g, '~1');
}

function unescapePathPart(path: string): string {
    return path.replace(/~1/g, '/').replace(/~0/g, '~');
}

function asJsonPointer(path: string[]): string {
    return !path?.length ? ""
        : "/" + path.map((s) => escapePathPart(s)).join("/");
}

export function asLodashPath(pointer: string): string[] {
    if (!pointer || !pointer.startsWith("/"))
        return null;
    const parts: string[] = pointer.slice(1).split("/")
        .map((s) => unescapePathPart(s));
    return !parts?.length ? [] : toPath(parts.join("."));
}

export function getValueByPointer(document: any, pointer: string): any {
    return pointer === "" ? document
        : get(document, asLodashPath(pointer));
}
