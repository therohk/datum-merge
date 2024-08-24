import { emptyObject, isArrayOf, isArrayOfAny, isArrayOfSame, isObject, isString, isVectorArray } from "../src/type-utils";

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

});