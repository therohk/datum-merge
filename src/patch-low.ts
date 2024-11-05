import { emptyArray } from "./type-utils";
import { Diff } from "./diff-lib/deep-diff";

/**
 * types poached from https://github.com/Starcounter-Jack/JSON-Patch
 */
export type Operation = AddOperation<any> | RemoveOperation | ReplaceOperation<any> | TestOperation<any>;
type PatchOperations = ReadonlyArray<Operation>;

interface BaseOperation {
    path: string;
}
interface AddOperation<T> extends BaseOperation {
    op: 'add';
    value: T;
}
interface RemoveOperation extends BaseOperation {
    op: 'remove';
}
interface ReplaceOperation<T> extends BaseOperation {
    op: 'replace';
    value: T;
}
interface TestOperation<T> extends BaseOperation {
    op: 'test';
    value: T;
}

export interface OperationResult<T> {
    removed?: any;
    test?: boolean;
    newDocument: T;
}

export interface PatchResult<T> extends Array<OperationResult<T>> {
    newDocument: T;
}

export function escapePathComponent(
    path: string | number
): string {
    if (typeof path === 'number')
        return path.toString();
    if (path.indexOf('/') === -1 && path.indexOf('~') === -1)
        return path;
    return path.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function unescapePathComponent(path: string): string {
    return path.replace(/~1/g, '/').replace(/~0/g, '~');
}

/**
 * convert deep diff to json patch model
 * only requires add/replace/remove operations
 */
export function diffToPatch(
    differences: readonly Diff<any, any>[]
): Operation[] {
    const jsonPatch: Operation[] = [];
    for (const difference of differences) {
        const diffPath = emptyArray(difference.path) ? ""
            : "/" + difference.path?.map(p => escapePathComponent(p)).join("/");
        switch (difference.kind) {
            case "N":
                jsonPatch.push({ op: "add", path: diffPath, value: difference.rhs });
                break;
            case "E":
                jsonPatch.push({ op: "replace", path: diffPath, value: difference.rhs });
                break;
            case "D":
                jsonPatch.push({ op: "remove", path: diffPath });
                break;
            case "A":
                const arrayPath = `${diffPath}/${difference.index}`;
                if (difference.item?.kind === 'N') {
                    jsonPatch.push({ op: "add", path: arrayPath, value: difference.item.rhs });
                }
                if (difference.item?.kind === 'D') {
                    jsonPatch.push({ op: "remove", path: arrayPath });
                }
                break;
        }
    }
    return jsonPatch;
}
