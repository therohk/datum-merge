
export { type Diff };
export { type PreFilterFunction };
export { type PreFilterObject };
export { type Accumulator };
export { type Observer };

export { diff };
export { orderIndependentDiff };
export { accumulateDiff };
export { observableDiff };
export { orderIndependentObservableDiff };
export { applyChange, revertChange };
export { applyDiff }; //prefer merge

//for tests
export { realTypeOf };
export { getOrderIndependentHash };

type DiffNew<RHS> = {
    readonly kind: "N";
    readonly path?: any[];
    readonly rhs: RHS;
};

type DiffDeleted<LHS> = {
    readonly kind: "D";
    readonly path?: any[];
    readonly lhs: LHS;
};

type DiffEdit<LHS, RHS = LHS> = {
    readonly kind: "E";
    readonly path?: any[];
    readonly lhs: LHS;
    readonly rhs: RHS;
};

type DiffArray<LHS, RHS = LHS> = {
    readonly kind: "A";
    readonly path?: any[];
    readonly index: number;
    readonly item: Diff<LHS, RHS>;
};

type Diff<LHS, RHS = LHS> = DiffNew<RHS> | DiffDeleted<LHS> | DiffEdit<LHS, RHS> | DiffArray<LHS, RHS>;
type DiffKind = Diff<any, any>["kind"];

type PreFilterFunction = (path: any[], key: any) => boolean;
type PreFilterObject<LHS, RHS = LHS> = {
    prefilter?(path: any[], key: any): boolean;
    normalize?(currentPath: any, key: any, lhs: LHS, rhs: RHS): [LHS, RHS] | false | undefined;
};
type PreFilter<LHS, RHS = LHS> = PreFilterFunction | PreFilterObject<LHS, RHS>;
type Filter<LHS, RHS = LHS> = (target: LHS, source: RHS, change: Diff<LHS, RHS>) => boolean;

type Accumulator<LHS, RHS = LHS> = {
    push(diff: Diff<LHS, RHS>): void;
    length: number;
};

type Observer<LHS, RHS = LHS> = (diff: Diff<LHS, RHS>) => void;

type FieldKey = string | number | symbol;
type FieldPath = FieldKey[];
type StackItem<LHS, RHS = LHS> = { lhs: LHS, rhs: RHS };

const typeNormalizer: PreFilterObject<any, any> = {
    normalize: function (currentPath: any, key: any, lhs: any, rhs: any): [any, any] {
        if (realTypeOf(lhs) === 'regexp' && realTypeOf(rhs) === 'regexp') {
            lhs = lhs.toString();
            rhs = rhs.toString();
        }
        if (realTypeOf(lhs) === 'date' && realTypeOf(rhs) === 'date') {
            lhs = (lhs as Date).valueOf();
            rhs = (rhs as Date).valueOf();
        }
        return [lhs, rhs];
    }
};

//-----------------------------------------------------------------------------

function diff<LHS, RHS = LHS>(
    lhs: LHS,
    rhs: RHS,
    prefilter?: PreFilter<LHS, RHS>,
): readonly Diff<LHS, RHS>[] {
    const changes: Diff<LHS, RHS>[] = [];
    deepDiff(lhs, rhs, changes, prefilter);
    return changes?.length ? changes : undefined;
}

function orderIndependentDiff<LHS, RHS = LHS>(
    lhs: LHS,
    rhs: RHS,
    prefilter?: PreFilter<LHS, RHS>,
): readonly Diff<LHS, RHS>[] {
    const changes: Diff<LHS, RHS>[] = [];
    deepDiff(lhs, rhs, changes, prefilter, null, null, null, true);
    return changes?.length ? changes : undefined;
}

function observableDiff<LHS, RHS = LHS>(
    lhs: LHS,
    rhs: RHS,
    observer?: Observer<LHS, RHS>,
    prefilter?: PreFilter<LHS, RHS>,
    orderIndependent?: boolean,
): Array<Diff<LHS, RHS>> {
    const changes: Diff<LHS, RHS>[] = [];
    deepDiff(lhs, rhs, changes, prefilter, null, null, null, orderIndependent);
    if (observer) {
        changes.forEach((c) => observer(c));
    }
    return changes;
}

function accumulateDiff<LHS, RHS = LHS>(
    lhs: LHS,
    rhs: RHS,
    prefilter?: PreFilter<LHS, RHS>,
    accum?: Accumulator<LHS, RHS>,
    orderIndependent?: boolean,
): Accumulator<LHS, RHS> | Diff<LHS, RHS>[] {
    const observer = (accum) ?
        function (difference: Diff<LHS, RHS>) {
            if (difference) {
                accum.push(difference);
            }
        } : undefined;
    const changes = observableDiff(lhs, rhs, observer, prefilter, orderIndependent);
    return accum ? accum : (changes.length) ? changes : undefined;
}

//-----------------------------------------------------------------------------

function orderIndependentObservableDiff<LHS, RHS = LHS>(
    lhs: LHS,
    rhs: RHS,
    changes: Array<Diff<LHS, RHS>>,
    prefilter?: PreFilter<LHS, RHS>,
    path?: any[],
    key?: any,
    stack?: any[],
): void {
    deepDiff(lhs, rhs, changes, prefilter, path, key, stack, true);
}

function deepDiff<LHS, RHS = LHS>(
    lhs: LHS,
    rhs: RHS,
    changes: Diff<LHS, RHS>[],
    prefilter?: PreFilter<LHS, RHS>,
    path?: any[],
    key?: any,
    stack?: any[],
    orderIndependent: boolean = false,
): void {
    changes = changes || [];
    path = path || [];
    stack = stack || [];

    const currentPath = path.slice(0);
    if (typeof key !== 'undefined' && key !== null) {
        if (prefilter) {
            if (typeof (prefilter) === 'function' && prefilter(currentPath, key)) {
                return;
            } else if (typeof (prefilter) === 'object') {
                if (prefilter.prefilter && prefilter.prefilter(currentPath, key)) {
                    return;
                }
                if (prefilter.normalize) {
                    const alt = prefilter.normalize(currentPath, key, lhs, rhs);
                    if (alt) {
                        lhs = alt[0];
                        rhs = alt[1];
                    }
                }
            }
        }
        currentPath.push(key);
    }

    // Use string comparison for regexes
    if (realTypeOf(lhs) === 'regexp' && realTypeOf(rhs) === 'regexp') {
        lhs = lhs.toString() as LHS;
        rhs = rhs.toString() as RHS;
    }

    const ltype = typeof lhs;
    const rtype = typeof rhs;
    const ldefined = ltype !== 'undefined' ||
        (stack && (stack.length > 0) && stack[stack.length - 1].lhs &&
            Object.getOwnPropertyDescriptor(stack[stack.length - 1].lhs, key));
    const rdefined = rtype !== 'undefined' ||
        (stack && (stack.length > 0) && stack[stack.length - 1].rhs &&
            Object.getOwnPropertyDescriptor(stack[stack.length - 1].rhs, key));

    //simple cases
    if (!ldefined && rdefined) {
        changes.push({
            kind: 'N',
            path: currentPath,
            rhs
        } as DiffNew<RHS>);
        return;
    } else if (!rdefined && ldefined) {
        changes.push({
            kind: 'D',
            path: currentPath,
            lhs
        } as DiffDeleted<LHS>);
        return;
    } else if (realTypeOf(lhs) !== realTypeOf(rhs)) {
        changes.push({
            kind: 'E',
            path: currentPath,
            lhs,
            rhs
        } as DiffEdit<LHS, RHS>);
        return;
    }

    if (realTypeOf(lhs) === 'date'
        && ((lhs as Date).valueOf() - (rhs as Date).valueOf()) !== 0) {
        changes.push({
            kind: 'E',
            path: currentPath,
            lhs,
            rhs
        } as DiffEdit<LHS, RHS>); new Date()
    } else if (ltype === 'object' && lhs !== null && rhs !== null) {
        let i: number, j: number;
        let other = false;
        for (i = stack.length - 1; i > -1; --i) {
            if (stack[i].lhs === lhs) {
                other = true;
                break;
            }
        }
        if (!other) {
            stack.push({ lhs: lhs, rhs: rhs });
            if (Array.isArray(lhs) && Array.isArray(rhs)) {
                i = rhs.length - 1;
                j = lhs.length - 1;
                // If order doesn't matter, we need to sort our arrays
                if (orderIndependent) {
                    lhs = lhs.slice().sort(function (a, b) {
                        return getOrderIndependentHash(a) - getOrderIndependentHash(b);
                    }) as LHS;
                    rhs = rhs.slice().sort(function (a, b) {
                        return getOrderIndependentHash(a) - getOrderIndependentHash(b);
                    }) as RHS;
                }

                while (i > j) {
                    changes.push({
                        kind: 'A',
                        path: currentPath,
                        index: i,
                        item: { kind: 'N', rhs: rhs[i--] } as DiffNew<RHS>,
                    } as DiffArray<LHS, RHS>);
                }
                while (j > i) {
                    changes.push({
                        kind: 'A',
                        path: currentPath,
                        index: j,
                        item: { kind: 'D', lhs: lhs[j--] } as DiffDeleted<LHS>,
                    } as DiffArray<LHS, RHS>);
                }
                for (; i >= 0; --i) {
                    deepDiff(lhs[i], rhs[i], changes, prefilter, currentPath, i, stack, orderIndependent);
                }
            } else {
                const akeys = [...Object.keys(lhs), ...Object.getOwnPropertySymbols(lhs)];
                const pkeys = [...Object.keys(rhs), ...Object.getOwnPropertySymbols(rhs)];
                for (i = 0; i < akeys.length; ++i) {
                    const k = akeys[i];
                    const ki = pkeys.indexOf(k);
                    if (ki >= 0) {
                        deepDiff(lhs[k], rhs[k], changes, prefilter, currentPath, k, stack, orderIndependent);
                        pkeys[ki] = null;
                    } else {
                        deepDiff(lhs[k], undefined, changes, prefilter, currentPath, k, stack, orderIndependent);
                    }
                }
                for (i = 0; i < pkeys.length; ++i) {
                    const k = pkeys[i];
                    if (k) {
                        deepDiff(undefined, rhs[k], changes, prefilter, currentPath, k, stack, orderIndependent);
                    }
                }
            }
            stack.pop();
        } else if ((lhs as any) !== (rhs as any)) {
            // lhs is contains a cycle at this element and it differs from rhs
            changes.push({
                kind: 'E',
                path: currentPath,
                lhs,
                rhs
            } as DiffEdit<LHS, RHS>);
        }
    } else if ((lhs as any) !== (rhs as any)) {
        if (!(ltype === 'number' && isNaN(lhs as number) && isNaN(rhs as number))) {
            changes.push({
                kind: 'E',
                path: currentPath,
                lhs,
                rhs
            } as DiffEdit<LHS, RHS>);
        }
    }
}

//-----------------------------------------------------------------------------

function applyDiff<LHS, RHS = LHS>(
    target: LHS,
    source: RHS,
    filter?: Filter<LHS, RHS>,
): LHS {
    if (!target || !source) {
        return;
    }
    const onChange = function (change: Diff<LHS, any>): void {
        if (!filter || filter(target, source, change)) {
            applyChange(target, source, change);
        }
    };
    observableDiff(target, source, onChange);
    return target;
}

function applyChange<LHS>(
    target: LHS,
    source: any,
    change: Diff<LHS, any>,
): void {
    if (!target || !change || !change.kind) {
        return;
    }
    let it = target;
    const rootPath = !change.path?.length;
    const last = rootPath ? 0 : change.path.length - 1;
    let i = -1;
    while (++i < last) {
        if (typeof it[change.path[i]] === 'undefined') {
            it[change.path[i]] = (
                typeof change.path[i + 1] !== 'undefined'
                && typeof change.path[i + 1] === 'number'
            ) ? [] : {};
        }
        it = it[change.path[i]];
    }
    switch (change.kind) {
        case 'A':
            if (!rootPath && typeof it[change.path[i]] === 'undefined') {
                it[change.path[i]] = [];
            }
            applyArrayChange(rootPath ? it : it[change.path[i]], change.index, change.item);
            break;
        case 'D':
            delete it[change.path[i]];
            break;
        case 'E':
        case 'N':
            it[change.path[i]] = change.rhs;
            break;
    }
}

function applyArrayChange<LHS>(
    arr: any[],
    index: number,
    change: Diff<LHS, any>,
): any[] {
    if (change.path && change.path.length > 0) {
        const u = change.path.length - 1;
        let it = arr[index];
        let i: number;
        for (i = 0; i < u; i++) {
            it = it[change.path[i]];
        }
        switch (change.kind) {
            case 'A':
                applyArrayChange(it[change.path[i]], change.index, change.item);
                break;
            case 'D':
                delete it[change.path[i]];
                break;
            case 'E':
            case 'N':
                it[change.path[i]] = change.rhs;
                break;
        }
    } else {
        switch (change.kind) {
            case 'A':
                applyArrayChange(arr[index], change.index, change.item);
                break;
            case 'D':
                arr = arrayRemove(arr, index);
                break;
            case 'E':
            case 'N':
                arr[index] = change.rhs;
                break;
        }
    }
    return arr;
}

function revertChange<LHS>(
    target: LHS,
    source: any,
    change: Diff<LHS, any>,
): void {
    if (!target || !change || !change.kind) {
        return;
    }
    let it = target;
    const rootPath = !change.path?.length;
    const last = rootPath ? 0 : change.path.length - 1;
    let i: number;
    for (i = 0; i < last; i++) {
        if (typeof it[change.path[i]] === 'undefined') {
            it[change.path[i]] = {};
            //here be dragons
        }
        it = it[change.path[i]];
    }
    switch (change.kind) {
        case 'A':
            // Array was modified...
            // it will be an array...
            revertArrayChange(rootPath ? it : it[change.path[i]], change.index, change.item);
            break;
        case 'D':
            // Item was deleted...
            it[change.path[i]] = change.lhs;
            break;
        case 'E':
            // Item was edited...
            it[change.path[i]] = change.lhs;
            break;
        case 'N':
            // Item is new...
            delete it[change.path[i]];
            break;
    }
}

function revertArrayChange<LHS>(
    arr: any[],
    index: number,
    change: Diff<LHS, any>,
): any[] {
    if (change.path && change.path.length > 0) {
        // the structure of the object at the index has changed...
        const u = change.path.length - 1;
        let it = arr[index];
        let i: number;
        for (i = 0; i < u; i++) {
            it = it[change.path[i]];
        }
        switch (change.kind) {
            case 'A':
                revertArrayChange(it[change.path[i]], change.index, change.item);
                break;
            case 'D':
                it[change.path[i]] = change.lhs;
                break;
            case 'E':
                it[change.path[i]] = change.lhs;
                break;
            case 'N':
                delete it[change.path[i]];
                break;
        }
    } else {
        // the array item is different...
        switch (change.kind) {
            case 'A':
                revertArrayChange(arr[index], change.index, change.item);
                break;
            case 'D':
                arr[index] = change.lhs;
                break;
            case 'E':
                arr[index] = change.lhs;
                break;
            case 'N':
                arr = arrayRemove(arr, index);
                break;
        }
    }
    return arr;
}

//-----------------------------------------------------------------------------

function arrayRemove(
    arr: any[],
    index: number,
): any[] {
    index = index < 0 ? arr.length + index : index;
    arr.splice(index, 1);
    return arr;
}

// function arrayRemove(
//     arr: any[],
//     from: number,
//     to?: number
// ): any[] {
//     const rest = arr.slice((to || from) + 1 || arr.length);
//     arr.length = from < 0 ? arr.length + from : from;
//     arr.push.apply(arr, rest);
//     return arr;
// }

function realTypeOf(val: any): string {
    const type = typeof val;
    if (type !== 'object') {
        return type;
    }
    if (val === Math) {
        return 'math';
    } else if (val === null) {
        return 'null';
    } else if (Array.isArray(val)) {
        return 'array';
    } else if (Object.prototype.toString.call(val) === '[object Date]') {
        return 'date';
    } else if (typeof val.toString === 'function' && /^\/.*\//.test(val.toString())) {
        return 'regexp';
    }
    return 'object';
}

// Gets a hash of the given object in an array order-independent fashion
// also object key order independent (easier since they can be alphabetized)
function getOrderIndependentHash(val: any): number {
    let accum = 0;
    const type = realTypeOf(val);
    if (type === 'array') {
        val.forEach(function (item: any) {
            // Addition is commutative so this is order indep
            accum += getOrderIndependentHash(item);
        });
        const arrayString = `[type: array, hash: ${accum}]`;
        return accum + hashThisString(arrayString);
    }
    if (type === 'object') {
        for (let key in val) {
            if (val.hasOwnProperty(key)) {
                const keyValueHash = getOrderIndependentHash(val[key]);
                const keyValueString = `[ type: object, key: ${key}, value hash: ${keyValueHash}]`;
                accum += hashThisString(keyValueString);
            }
        }
        return accum;
    }
    // Non object, non array...should be good?
    const stringToHash = `[ type: ${type} ; value: ${val}]`;
    return accum + hashThisString(stringToHash);
}

// http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
function hashThisString(str: string): number {
    let hash = 0;
    if (str.length === 0) {
        return hash;
    }
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}
