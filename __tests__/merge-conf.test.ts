import { deepClone } from "../src/datum-utils";
import { UpdateCode } from "../src/merge-low";
import { DetailConfig, fillUpdateCodes, immutableCustomMerge, immutableDetailMerge } from "../src/merge-conf";

describe("validate-merge-conf", () => {

    test('should detail merge fields with exact config', async () => {

        const deepT = { oa: [{ x: "a" }, { c: "z" }, { b: "b" }], o: { z: ["a", "b"] }, del: "x" };
        const deepS = { oa: [{ y: "b" }, { b: "b" }], o: { z: ["c"] }, del: null };

        const nCodes: DetailConfig = { oa: UpdateCode.N, o: UpdateCode.N, del: UpdateCode.N };
        const yCodes: DetailConfig = { oa: UpdateCode.Y, o: UpdateCode.Y, del: UpdateCode.Y };
        const mCodes: DetailConfig = { oa: UpdateCode.XM, o: UpdateCode.B, del: UpdateCode.D };
        const oCodes: DetailConfig = { oa: UpdateCode.XI, o: { z: UpdateCode.XF } };

        const mCodesBkp = deepClone(mCodes);
        const oCodesBkp = deepClone(oCodes);

        expect(immutableDetailMerge(deepT, deepS, nCodes)).toMatchObject(deepT);
        expect(immutableDetailMerge(deepT, deepS, {})).toMatchObject(deepT);
        expect(immutableDetailMerge(deepT, deepS, yCodes)).toMatchObject(deepS);
        expect(immutableDetailMerge(deepT, deepT, yCodes)).toMatchObject(deepT);

        const mDeepT = immutableDetailMerge(deepT, deepS, mCodes);
        expect(mDeepT.oa.length).toBe(4);
        expect(mDeepT.o).toMatchObject(deepS.o);
        expect(mDeepT.del).not.toBeDefined();

        const oDeepT = immutableDetailMerge(deepT, deepS, oCodes);
        expect(oDeepT.oa).toMatchObject([{ b: "b" }]);
        expect(oDeepT.o).toMatchObject({ z: ["c", "a", "b"] });
        expect(oDeepT.del).toBeDefined();

        expect(mCodes).toEqual(mCodesBkp);
        expect(oCodes).toEqual(oCodesBkp);

    });

    test('should custom merge fields with filled config', async () => {

        expect(immutableCustomMerge({}, { s: "new" }, { scalar: UpdateCode.B })).toEqual({ s: "new" });
        expect(immutableCustomMerge({ v: ["old"] }, { v: "new" }, { "*": UpdateCode.XM }).v).toEqual(["old", "new"]);

        const ucTrg = { sc: "t", vc: ["1", "2"], m: ["2"], pAt2: 3 };
        const ucTest = {
            sc: "s", vc: ["3", "1"], m: ["3"], pAt: "val", pAt2: 2,
            e1: null, e2: undefined, e3: {}, e4: [],
            ob: { x: 1 }, odp: [{ a: "1" }, { a: "2" }]
        };

        expect(fillUpdateCodes(ucTrg, {})).toMatchObject({ sc: UpdateCode.B, vc: UpdateCode.XS, m: UpdateCode.XS, pAt2: UpdateCode.B });
        expect(Object.keys(fillUpdateCodes(ucTrg, {}))).toEqual(Object.keys(ucTrg));
        expect(Object.keys(fillUpdateCodes(ucTest, {}))).toEqual(Object.keys(ucTest));

        expect(immutableCustomMerge(ucTrg, ucTest, { "*": UpdateCode.N })).toEqual(ucTrg);
        expect(immutableCustomMerge(ucTrg, ucTest, { vc: UpdateCode.XM }).vc).toEqual(["1", "2", "3"]);
        expect(immutableCustomMerge(ucTrg, ucTest, { scalar: UpdateCode.Y, vector: UpdateCode.XR, nested: UpdateCode.Y })).toBeDefined();
        expect(immutableCustomMerge(ucTrg, ucTest, { scalar: UpdateCode.B, vector: UpdateCode.XM, nested: UpdateCode.B })).toBeDefined();

        expect(immutableCustomMerge(ucTrg, ucTest, {
            ["*A*"]: UpdateCode.I,
            "m": UpdateCode.XF,
            "vc": UpdateCode.XI,
            ob: { x: UpdateCode.XI },
            vector: UpdateCode.N,
        })).toEqual({ sc: "s", vc: ["1"], m: ["3", "2"], pAt: "val", pAt2: 3, ob: { x: 1 } });

    });

});
