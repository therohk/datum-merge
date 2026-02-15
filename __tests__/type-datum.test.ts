import { emptyObject, emptyValue, isArrayOf, isArrayOfAny, isArrayOfSame, isObject, isString, typeOfValue } from "../src/type-utils";
import { areArraysEqual, deepClone, deepEquals, deepEqualsPath } from "../src/datum-utils";
import { deepDiffFlat, deepDiffTyped, flattenObject, unflattenObject } from "../src/diff-high";

describe("validate-utils", () => {

    test('should validate type utils', async () => {

        expect(isObject({})).toBe(true);
        expect(isObject([])).toBe(false);
        expect(isObject([[], []])).toBe(false);

        expect(emptyObject([])).toBe(true); //todo
        expect(emptyObject([2])).toBe(false);
        expect(emptyObject({})).toBe(true);
        expect(emptyObject({ x: undefined })).toBe(false);

        expect(emptyValue("")).toBe(false);
        expect(emptyValue([])).toBe(true);
        expect(emptyValue([undefined])).toBe(false);
        expect(emptyValue({})).toBe(true);
        expect(emptyValue({ x: undefined })).toBe(false);

        expect(typeOfValue("")).toBe("string");
        expect(typeOfValue(123)).toBe("number");
        expect(typeOfValue(false)).toBe("boolean");
        expect(typeOfValue([])).toBe("array");
        expect(typeOfValue([{}])).toBe("array");
        expect(typeOfValue({})).toBe("object");
        expect(typeOfValue({ x: [] })).toBe("object");
        expect(typeOfValue(new Date())).toBe("object");
        expect(typeOfValue(/.*/)).toBe("object");

        //generic array
        expect(isArrayOfAny(undefined)).toBe(false);
        expect(isArrayOfAny({})).toBe(false);
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
        expect(one).toMatchObject(unflattenObject(flatOne));
        expect(two).toMatchObject(unflattenObject(flatTwo));

        const [updated, removed] = deepDiffFlat(two, one, true);
        expect(updated).toBeDefined();
        expect(removed).toBeDefined();

        expect(one).toEqual(oneBkp);
        expect(two).toEqual(twoBkp);
    });

    test('objects match with deep equality checks', async () => {

        const lhsO = { o: [{ a: 1 }, { b: 2 }], v: ["11", "22", "33"] };
        const rhsO = { o: [{ a: 1 }, { b: 2 }], v: ["11", "22", "33"] };

        expect(areArraysEqual(lhsO.v, rhsO.v)).toBeTruthy();
        expect(areArraysEqual(lhsO.o, rhsO.o)).toBeFalsy();
        expect(areArraysEqual(lhsO.o, lhsO.o)).toBeTruthy();

        expect(deepEquals(lhsO.v, rhsO.v)).toBeTruthy();
        expect(deepEquals(lhsO.o, rhsO.o)).toBeTruthy();

        expect(deepEqualsPath(lhsO, rhsO, "v")).toBeTruthy();
        expect(deepEqualsPath(lhsO, rhsO, "o")).toBeTruthy();
        expect(deepEqualsPath(lhsO, { o: rhsO.v }, "o")).toBeFalsy();

        expect(deepDiffFlat(rhsO, lhsO, true)).toMatchObject([{}, {}]);
        expect(deepDiffTyped<any>(lhsO, rhsO)).toEqual({});
        expect(deepDiffTyped<any>(rhsO, lhsO)).toEqual({});
    });

});