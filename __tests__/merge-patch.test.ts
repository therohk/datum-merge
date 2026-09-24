import { deepClone } from "../src/datum-utils";
import { deepCompact } from "../src/diff-high";
import { UpdateCode } from "../src/merge-low";
import { MergeConfig, immutableCustomMerge } from "../src/merge-conf";
import { bypassMergePatch, customMergePatch } from "../src/merge-patch";
import { deepPatchLog, immutablePatch } from "../src/patch-low";

describe("validate-merge-patch", () => {

    const ucTrg = {
        sc: "t", pAt2: 3,
        vc: ["1", "2"], m: ["2"], vcd: ["1"],
        vca: ["2"], vcr: ["3", "1", "2"],
        sty: "s", dme: "s", dme2: "s",
        ono: [{ a: "2" }],
        obu: { y: "t" }, oba: { z: [2] },
        obx: { l: 4 }, obd: { d: 1 },
    };

    const ucSrc = {
        sc: "s", pAt: "val", pAt2: 2,
        vc: ["3", "1"], m: ["3"], vcn: ["1"],
        vca: ["1", "3"], vcr: ["1"],
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
        ["vc*"]: UpdateCode.XR,
        vca: UpdateCode.XM,
        vcr: UpdateCode.XI,
        dme: UpdateCode.D,
        dme2: UpdateCode.D, //skipped
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

        const patchedOne = immutablePatch(ucTrg, patchLog, "apply");
        const unpatchedOne = immutablePatch(patchedOne, patchLog, "revert");
        const unpatchedTwo = immutablePatch(mergedOne, patchLog, "revert");

        expect(patchedOne).toEqual(mergedOne);
        expect(unpatchedOne).toEqual(ucTrg);
        expect(unpatchedTwo).toEqual(ucTrg);

        //jest doesnt pick holes
        // expect(patchedOne).toStrictEqual(mergedOne);
        expect(unpatchedOne).toStrictEqual(unpatchedTwo); //same holes
        // expect(unpatchedOne).toStrictEqual(ucTrg);
        // expect(unpatchedTwo).toStrictEqual(ucTrg);

        const p1Clone = deepClone(patchedOne);
        expect(p1Clone).not.toStrictEqual(patchedOne);

        const compP1 = deepCompact(patchedOne);
        const compUp1 = deepCompact(unpatchedOne);
        const compUp2 = deepCompact(unpatchedTwo);
        expect(patchedOne).toStrictEqual(mergedOne);
        expect(unpatchedOne).toStrictEqual(ucTrg);
        expect(unpatchedTwo).toStrictEqual(ucTrg);

        const forced1 = customMergePatch<any>(deepClone(ucTrg), ucSrc, yc) || [];
        const forced2 = bypassMergePatch<any>(deepClone(ucTrg), ucSrc) || [];
        expect(forced1).not.toEqual(forced2);
        expect(forced1.length).toEqual(forced2.length - 2); //nulls kept

        const target3 = deepClone(ucTrg);
        const merged3 = customMergePatch<any>(target3, ucSrc, mc, []) || [];
        expect(target3).not.toEqual(ucTrg);
        expect(immutablePatch(target3, merged3, "revert")).toEqual(ucTrg);
        expect(immutablePatch(ucTrg, merged3, "apply")).toEqual(target3);
    });

});