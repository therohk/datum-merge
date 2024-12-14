
export type PrimitiveType = "string" | "number" | "boolean";
export type Primitive = string | number | boolean;
export type PrimitiveArray = string[] | number[] | boolean[];
export type VectorArray = string[] | number[];

export type ObjectKeys<T> = keyof T;
export type ObjectVals<T> = T[keyof T];
export type Prettify<T> = { [K in keyof T]: T[K]; } & {};

export type SafeTypes = Primitive | VectorArray;
export type SafeTupleObj = { [label: string]: SafeTypes };
export type TupleObj = { [label: string]: any };

export function isString(value: any): value is string {
    return typeof value === 'string';
}

export function isNumber(value: any): value is number {
    return typeof value === 'number';
}

export function isBoolean(value: any): value is boolean {
    return typeof value === 'boolean';
}

export function isPrimitive(value: any): value is Primitive {
    return ['string', 'number', 'boolean'].includes(typeof value);
}

export function isNullish(value: any): boolean {
    return value === undefined || value === null;
}

export function emptyString(str: string): boolean {
    return (str == null)
        || (str === '')
        || (/^\s*$/.test(str));
}

export function integerString(str: string): boolean {
    return ((str != null)
        && (str !== '')
        && Number.isSafeInteger(Number(str.toString())));
}

export function isObject(value: any): value is object {
    return typeof value === 'object'
        && !Array.isArray(value)
        && value !== null;
}

export function emptyObject(obj: object): boolean {
    return (obj === undefined)
        || (obj === null)
        || (!Object.keys(obj).length);
}

export function isArrayOfAny(value: any): value is any[] {
    return Array.isArray(value);
}

export function emptyArray(arr: any): boolean {
    return Array.isArray(arr) && !arr?.length;
}

export function isArrayOf<T>(
    arr: any,
    typeCheck: (item: any) => item is T,
): arr is T[] {
    return Array.isArray(arr)
        && arr.length > 0
        && arr.every(typeCheck);
}

export function isArrayOfSame(arr: any): string | false {
    return Array.isArray(arr)
        && new Set(arr.map((e) => typeof e)).size === 1
        ? typeof arr[0] : false;
}

export function isVectorArray(arr: any): arr is VectorArray {
    return Array.isArray(arr)
        && new Set(arr.map((e) => typeof e)).size === 1
        && ['string', 'number'].includes(typeof arr[0]);
    //dont encourage boolean arrays
}

export function emptyValue(obj: any): boolean {
    return (obj === undefined)
        || (obj === null)
        || (Array.isArray(obj) && !obj.length)
        || (typeof obj === "object" && !Object.keys(obj).length);
}
