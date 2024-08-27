import { UpdateCode } from "../src/merge-low";
import { DetailConfig, immutableDetailMerge } from "../src/merge-conf";

describe("validate-merge-conf", () => {

    test('should detail merge fields with exact config', async () => {

        const deepT = { oa: [{ x: "a" }, { c: "z" }, { b: "b" }], o: { z: ["a", "b"] }, del: "x" };
        const deepS = { oa: [{ y: "b" }, { b: "b" }], o: { z: ["c"] }, del: null };

        const nCodes: DetailConfig = { oa: UpdateCode.N, o: UpdateCode.N, del: UpdateCode.N };
        const yCodes: DetailConfig = { oa: UpdateCode.Y, o: UpdateCode.Y, del: UpdateCode.Y };
        const mCodes: DetailConfig = { oa: UpdateCode.XM, o: UpdateCode.B, del: UpdateCode.D };
        const oCodes: DetailConfig = { oa: UpdateCode.XI, o: { z: UpdateCode.XF } };

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

    });

});
