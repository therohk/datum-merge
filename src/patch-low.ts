import { toPath } from "lodash-es";
import { Diff } from "./diff-lib/deep-diff";

export type PatchResult<T = any> = {
    path: string;
    op: 'add' | "remove" | "replace";
    value?: T;
};

function escapePathPart(
    path: string | number
): string {
    if (typeof path === 'number')
        return path.toString();
    if (path.indexOf('/') === -1 && path.indexOf('~') === -1)
        return path;
    return path.replace(/~/g, '~0').replace(/\//g, '~1');
}

function unescapePathPart(path: string): string {
    return path.replace(/~1/g, '/').replace(/~0/g, '~');
}

function asPatchPath(path: string[]): string {
    return "/" + (path?.map((s) => escapePathPart(s)).join("/") ?? "");
}

export function asLodashPath(pointer: string): string[] {
    if (!pointer || !pointer.startsWith("/"))
        return null;
    const parts: string[] = pointer.slice(1).split("/")
        .map((s) => unescapePathPart(s));
    return !parts?.length ? [] : toPath(parts.join("."));
}

/**
 * convert deep diff to json patch model
 * only requires add/replace/remove operations
 * can be used with any diff operation
 */
export function diffToPatchLog(
    differences: readonly Diff<any, any>[]
): PatchResult[] {
    const jsonPatch: PatchResult[] = [];
    for (const difference of differences) {
        const difPath = asPatchPath(difference.path);
        switch (difference.kind) {
            case "N":
                jsonPatch.push({ op: "add", path: difPath, value: difference.rhs });
                break;
            case "E":
                jsonPatch.push({ op: "replace", path: difPath, value: difference.rhs });
                break;
            case "D":
                jsonPatch.push({ op: "remove", path: difPath });
                break;
            case "A":
                const vecPath = `${difPath}/${difference.index}`;
                if (difference.item?.kind === 'N') {
                    jsonPatch.push({ op: "add", path: vecPath, value: difference.item.rhs });
                }
                if (difference.item?.kind === 'D') {
                    jsonPatch.push({ op: "remove", path: vecPath });
                }
                break;
        }
    }
    return jsonPatch;
}
