import { deepClone } from "../src/datum-utils";
import { UpdateCode } from "../src/merge-low";
import { deepDiffTyped } from "../src/diff-high";
import { bypassMergeDiff, diffFromMerge, immutableDeepMerge } from "../src/merge-high";
import { DetailConfig, immutableDetailMerge } from "../src/merge-conf";
import { MergeConfig, customMergeDiff, fillUpdateCodes, immutableCustomMerge } from "../src/merge-conf";

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

        expect(immutableDetailMerge(deepT, deepS, nCodes)).toStrictEqual(deepT);
        expect(immutableDetailMerge(deepT, deepS, {})).toStrictEqual(deepT);
        expect(immutableDetailMerge(deepT, deepS, yCodes)).toStrictEqual(deepS);
        expect(immutableDetailMerge(deepT, deepT, yCodes)).toStrictEqual(deepT);

        const mDeepT = immutableDetailMerge(deepT, deepS, mCodes);
        expect(mDeepT.oa.length).toBe(4);
        expect(mDeepT.o).toStrictEqual(deepS.o);
        expect(mDeepT.del).not.toBeDefined();

        const oDeepT = immutableDetailMerge(deepT, deepS, oCodes);
        expect(oDeepT.oa).toStrictEqual([{ b: "b" }]);
        expect(oDeepT.o).toStrictEqual({ z: ["c", "a", "b"] });
        expect(oDeepT.del).toStrictEqual("x");

        expect(mCodes).toStrictEqual(mCodesBkp);
        expect(oCodes).toStrictEqual(oCodesBkp);
    });

    test('should custom merge fields with filled config', async () => {

        expect(immutableCustomMerge({}, { s: "new" }, { scalar: UpdateCode.B })).toEqual({ s: "new" });
        expect(immutableCustomMerge({ v: ["old"] }, { v: "new" }, { "*": UpdateCode.XM }).v).toEqual(["old", "new"]);

        const ucTrg = { sc: "t", vc: ["1", "2"], m: ["2"], pAt2: 3, obu: { y: "t" } };
        const ucTest = {
            sc: "s", vc: ["3", "1"], m: ["3"], pAt: "s", pAt2: 2,
            e1: null, e2: undefined, e3: {}, e4: [],
            ono: [{ a: "1" }, { a: "2" }],
            obs: { x: 1, y: "s" }, obv: { x: 2 }, obu: { z: 3 },
        };

        const ucTrgBkp = deepClone(ucTrg);

        expect(fillUpdateCodes(ucTrg, {})).toMatchObject({ sc: UpdateCode.B, vc: UpdateCode.XS, m: UpdateCode.XS, pAt2: UpdateCode.B });
        expect(Object.keys(fillUpdateCodes(ucTrg, {}))).toStrictEqual(Object.keys(ucTrg));
        expect(Object.keys(fillUpdateCodes(ucTest, {}))).toStrictEqual(Object.keys(ucTest));

        expect(immutableCustomMerge(ucTrg, ucTest, { "*": UpdateCode.N })).toEqual(ucTrg);
        expect(immutableCustomMerge(ucTrg, ucTest, { vc: UpdateCode.XM }).vc).toEqual(["1", "2", "3"]);
        expect(immutableCustomMerge(ucTrg, ucTest, { scalar: UpdateCode.Y, vector: UpdateCode.XR, nested: UpdateCode.Y })).toBeDefined();
        expect(immutableCustomMerge(ucTrg, ucTest, { scalar: UpdateCode.B, vector: UpdateCode.XM, nested: UpdateCode.B })).toBeDefined();

        const mergeConf: MergeConfig = {
            vc: UpdateCode.XI,
            m: UpdateCode.XF,
            ["e*"]: UpdateCode.Y,
            ["*A*"]: UpdateCode.I,
            vector: UpdateCode.XI,
            ["ob*"]: { x: UpdateCode.B, y: UpdateCode.N, z: UpdateCode.XM },
            obv: UpdateCode.XM,
            pAt: UpdateCode.B,
        };
        expect(fillUpdateCodes(ucTest, {}, true, [])).toMatchObject({ e1: 'N', e2: 'N', e3: 'N', e4: 'XS' });
        expect(fillUpdateCodes(ucTest, mergeConf)).toMatchObject({ obs: { x: 'B', y: 'N' }, obv: 'XM', obu: { z: 'XM' } });
        expect(fillUpdateCodes(ucTest, { ...mergeConf, ["*At*"]: UpdateCode.N })).toMatchObject({ pAt: 'B', pAt2: 'N' });

        expect(immutableCustomMerge(ucTrg, ucTest, mergeConf)).toEqual({
            sc: "s", vc: ["1"], m: ["3", "2"],
            pAt: "s", pAt2: 3, e3: {}, e4: [],
            obs: { x: 1 }, obv: [{ x: 2 }], obu: { y: "t", z: [3] },
        });

        const yDiff1 = customMergeDiff<any>(deepClone(ucTrg), ucTest, { scalar: "Y", vector: "Y", nested: "Y" });
        const yDiff2 = customMergeDiff<any>(deepClone(ucTrg), ucTest, { "*": UpdateCode.Y });
        expect(yDiff1).toEqual(yDiff2);

        const bDiff1 = bypassMergeDiff(deepClone(ucTrg), ucTest);
        const bDiff2 = diffFromMerge(ucTrg, ucTest, UpdateCode.Y, undefined, undefined, true);
        const bDiff3 = deepDiffTyped(ucTrg, immutableDeepMerge(ucTrg, ucTest, UpdateCode.Y), true);
        expect(bDiff1).toMatchObject(bDiff2);
        expect(bDiff1).toMatchObject(bDiff3);
        expect(bDiff1).toEqual({ ...yDiff2, e1: null, e2: undefined });
    });

});
