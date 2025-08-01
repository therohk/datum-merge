import { deepClone } from "../src/datum-utils";
import { UpdateCode } from "../src/merge-low";
import { MergeConfig, immutableCustomMerge } from "../src/merge-conf";
import { bypassMergePatch, customMergePatch } from "../src/merge-patch";
import { applyPatchLog, deepPatchLog, revertPatchLog } from "../src/patch-low";

describe("validate-merge-patch", () => {

    const ucTrg = {
        sc: "t", vc: ["1", "2"], m: ["2"], pAt2: 3,
        sty: "s", dme: "s",
        ono: [{ a: "2" }],
        obu: { y: "t" }, oba: { z: [2] },
        obx: { l: 4 }, obd: { d: 1 }
    };

    const ucSrc = {
        sc: "s", vc: ["3", "1"], m: ["3"], pAt: "val", pAt2: 2,
        e1: null, e2: undefined, e3: {}, e4: [], dme: null,
        ono: [{ a: "1" }, { a: "2" }],
        obs: { x: 1, y: "s" }, obv: { x: 2 },
        obu: { z: 3 }, oba: { z: 3 }, obn: { z: 3 },
        obc: { x: 1, y: "z" }, obx: { p: ["1"], l: 2 },
    };

    const yc: MergeConfig = {
        scalar: UpdateCode.Y,
        vector: UpdateCode.Y,
        nested: UpdateCode.Y,
    };

    const mc: MergeConfig = {
        m: UpdateCode.XF,
        vc: UpdateCode.XI,
        dme: UpdateCode.D,
        ono: UpdateCode.XM,
        vector: UpdateCode.N,
        ["*A*"]: UpdateCode.I,
        ["e*"]: UpdateCode.Y,
        ["ob*"]: { x: UpdateCode.B, y: UpdateCode.N, z: UpdateCode.XM },
        obv: UpdateCode.XM,
        obc: { x: UpdateCode.D, y: UpdateCode.B },
        obx: { vector: UpdateCode.XI },
        obd: { d: UpdateCode.D },
    };

    let trgBkp: any = null;
    let srcBkp: any = null;
    beforeEach(() => {
        trgBkp = deepClone(ucTrg);
        srcBkp = deepClone(ucSrc);
    });

    afterEach(() => {
        //no side effects
        expect(ucTrg).toEqual(trgBkp);
        expect(ucSrc).toEqual(srcBkp);
    });

    test('should apply and revert patch log', async () => {

        const mergedOne = immutableCustomMerge(ucTrg, ucSrc, mc);
        const patchLog = deepPatchLog(ucTrg, mergedOne, false, true);

        const patchedOne = applyPatchLog(patchLog, deepClone(ucTrg));
        const unpatchedOne = revertPatchLog(patchLog, deepClone(patchedOne));
        const unpatchedTwo = revertPatchLog(patchLog, deepClone(mergedOne));

        expect(patchedOne).toEqual(mergedOne);
        expect(unpatchedOne).toEqual(ucTrg);
        expect(unpatchedTwo).toEqual(ucTrg);

        const forced1 = customMergePatch<any>(deepClone(ucTrg), ucSrc, yc) || [];
        const forced2 = bypassMergePatch<any>(deepClone(ucTrg), ucSrc) || [];
        expect(forced1).not.toEqual(forced2);
        expect(forced1.length).toEqual(forced2.length - 2); //nulls kept

        const target3 = deepClone(ucTrg);
        const merged3 = customMergePatch<any>(target3, ucSrc, mc, []) || [];
        expect(target3).not.toEqual(ucTrg);
        expect(revertPatchLog(merged3, deepClone(target3))).toEqual(ucTrg);
        expect(applyPatchLog(merged3, deepClone(ucTrg))).toEqual(target3);

    });

});