import { emptyObject, isArrayOf, isArrayOfAny, isArrayOfSame, isObject, isString, isVectorArray } from "../src/type-utils";
import { deepClone, flattenObject, unflattenObject } from "../src/datum-utils";
import { deepDiffFlat } from "../src/diff-high";

describe("validate-utils", () => {

    test('should validate type utils', async () => {

        expect(!"").toBe(true);
        expect(![]).toBe(false);
        expect(![].length).toBe(true);
        expect(!{}).toBe(false);

        expect(isObject({})).toBe(true);
        expect(isObject([])).toBe(false);
        expect(isObject([[], []])).toBe(false);

        expect(emptyObject([])).toBe(true); //todo
        expect(emptyObject([2])).toBe(false);
        expect(emptyObject({})).toBe(true);
        expect(emptyObject({ x: undefined })).toBe(false);

        //safe arrays
        //obsolete: all types accepted now
        expect(isVectorArray(["str", "str"])).toBe(true);
        expect(isVectorArray([2, 2])).toBe(true);
        expect(isVectorArray(["2", 2])).toBe(false);
        expect(isVectorArray("str")).toBe(false);
        expect(isVectorArray([true, false])).toBe(false);
        expect(isVectorArray([{}, {}])).toBe(false);

        //generic array
        expect(isArrayOfAny(undefined)).toBe(false);
        expect(isArrayOfAny([])).toBe(true);
        expect(isArrayOfAny(["2", 2, false])).toBe(true);

        expect(isArrayOf(["2", "2"], isString)).toBe(true);
        expect(isArrayOf(["2", 2], isString)).toBe(false);
        expect(isArrayOf([], isString)).toBe(false);
        expect(isArrayOf([{}, {}], isString)).toBe(false);

        expect(isArrayOfSame(["2", 2])).toBe(false);
        expect(isArrayOfSame(["2", "2"])).toBe("string");
        expect(isArrayOfSame([2, 2])).toBe("number");
        expect(isArrayOfSame([{ a: "a" }, { b: "b" }])).toBe("object");

    });

    test('should flatten and unflatten object', async () => {

        const one = { same: "val", arr: ["1", "2", "5"], simp: "was", remove: "me", change: ["woof"], deep: { x: "1", y: "2", a: [5, 6] } };
        const two = { same: "val", arr: ["1", "56", "2", "4"], simp: "now", insert: "this", change: ["oink"], deep: { z: "3", y: "4" } };
        const oneBkp = deepClone(one);
        const twoBkp = deepClone(two);

        const flatOne = flattenObject(one);
        const flatTwo = flattenObject(two);
        // console.log("flat", flatObj);
        expect(one).toMatchObject(unflattenObject(flatOne));
        expect(two).toMatchObject(unflattenObject(flatTwo));

        const [updated, removed] = deepDiffFlat(two, one, true);
        expect(updated).toBeDefined();
        expect(removed).toBeDefined();
        // console.log("fdiff", { updated, removed });

        expect(one).toEqual(oneBkp);
        expect(two).toEqual(twoBkp);
    });

});