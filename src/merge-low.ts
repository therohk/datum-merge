// import { get, has, set, unset } from "lodash-es";
import { concat, differenceWith, intersectionWith, unionWith, isEqual } from "lodash-es";
import { isArrayOfAny, isNullish } from "./type-utils";
import { areArraysEqual, deepClone } from "./data-utils";

export enum UpdateCode {
    T = "T", //touch, blank update
    C = "C", //create instance
    // scalar/def codes
    N = "N", //ignore change
    Y = "Y", //accept any change
    B = "B", //insert or update, no delete
    U = "U", //update or delete only
    H = "H", //update only if exists
    I = "I", //insert only
    D = "D", //delete only
    // vector/xref codes
    XR = "XR", //full replace
    XM = "XM", //set union, vector merge
    XD = "XD", //set difference, delete given values
    XI = "XI", //set intersection, delete missing values
    XS = "XS", //preserve order insert (allows dupes)
    XF = "XF", //insert from start (allows dupes)
};

export function mergeScalarField(
    target: any,
    source: any,
    label: string,
    mergeCode: UpdateCode,
): boolean {
    const sourceHas = !isNullish(source[label]);
    const targetHas = target.hasOwnProperty(label); //!isNullish(target[label]);
    if (!targetHas && !sourceHas) {
        return false;
    }
    if (targetHas && sourceHas) {
        //lhs vs rhs type check
        if (typeof target[label] !== typeof source[label]) {
            throw new TypeError("field type mismatch for " + label);
        }
        if (target[label] === source[label]) {
            return false;
        }
    }
    let migrateVal = false;
    switch (mergeCode) {
        case UpdateCode.N:
            return false;
        case UpdateCode.Y:
            target[label] = source[label];
            return true;
        case UpdateCode.B:
            if (sourceHas) migrateVal = true;
            break;
        case UpdateCode.U:
            if (targetHas) migrateVal = true;
            break;
        case UpdateCode.I:
            if (!targetHas) migrateVal = true;
            break;
        case UpdateCode.H:
            if (targetHas && sourceHas) migrateVal = true;
            break;
        case UpdateCode.D:
            if (targetHas && !sourceHas) migrateVal = true;
            break;
        case UpdateCode.XR:
        case UpdateCode.XS:
        case UpdateCode.XF:
        case UpdateCode.XM:
        case UpdateCode.XD:
        case UpdateCode.XI:
            return mergeVectorField(target, source, label, mergeCode);
    }
    if (migrateVal) {
        if (sourceHas) {
            // isPrimitive(source[label]); //avoid cloning
            target[label] = deepClone(source[label]);
        } else {
            delete target[label];
        }
        return true;
    }
    return false;
};

export function mergeVectorField(
    target: any,
    source: any,
    label: string,
    mergeCode: UpdateCode,
): boolean {
    let sourceVals = source[label]; //get(source, label);
    if (isNullish(sourceVals)) {
        return false; //sourceHas
    }
    let sourceVec = isArrayOfAny(sourceVals);
    const targetHas = target.hasOwnProperty(label);
    const targetVec = isArrayOfAny(target[label]);
    if (targetHas && !targetVec) {
        //should T => T[] change be allowed  
        throw new TypeError("type change to vector for " + label);
    }
    //todo verify same array types
    if (!sourceVec) {
        sourceVals = [sourceVals] as unknown[];
        sourceVec = true;
    }

    let targetVals: unknown[];
    switch (mergeCode) {
        case UpdateCode.N:
            return false;
        case UpdateCode.Y:
        case UpdateCode.XR:
            target[label] = deepClone(sourceVals);
            return true;
        // case UpdateCode.C:
        case UpdateCode.XS:
            targetVals = concat(target[label] ?? [], sourceVals);
            break;
        case UpdateCode.XF:
            //entire array appears in diff
            targetVals = concat(sourceVals, target[label] ?? []);
            break;
        case UpdateCode.B:
        case UpdateCode.XM:
            targetVals = unionWith(target[label], sourceVals, isEqual);
            break;
        // case UpdateCode.D:
        case UpdateCode.XD:
            targetVals = differenceWith(target[label], sourceVals, isEqual);
            break;
        case UpdateCode.XI:
            targetVals = intersectionWith(target[label], sourceVals, isEqual);
            break;
        default:
            return false;
    }
    if (!targetVals?.length) {
        delete target[label];
        return true;
    }

    const changed = !areArraysEqual(targetVals, target[label]);
    // && !deepEquals(targetVals, target[label]);
    //always clone source objects?
    target[label] = targetVals; //array replaced
    // set(target, label, targetVals);
    return changed;
};
