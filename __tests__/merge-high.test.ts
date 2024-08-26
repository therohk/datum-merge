import { deepClone } from "../src/datum-utils";
import { UpdateCode } from "../src/merge-low";
import { DetailConfig, immutableDetailMerge, immutableMerge } from "../src/merge-high";

describe("validate-merge-utils", () => {

    test('should merge scalar fields with update code', async () => {
        const lhsS = { y: "t", z: "t" };
        const rhsS = { x: "s", z: "s" };

        //scalar merge
        expect(immutableMerge(lhsS, rhsS, UpdateCode.B)).toEqual({ x: "s", y: "t", z: "s" });
        expect(immutableMerge(lhsS, rhsS, UpdateCode.U)).toEqual({ y: "t", z: "s" });
        expect(immutableMerge(lhsS, rhsS, UpdateCode.H)).toEqual({ y: "t", z: "s" });
        expect(immutableMerge(lhsS, rhsS, UpdateCode.D)).toEqual({ y: "t", z: "t" });
        expect(immutableMerge(lhsS, rhsS, UpdateCode.I)).toEqual({ x: "s", y: "t", z: "t" });
        expect(immutableMerge(lhsS, rhsS, UpdateCode.Y)).toEqual({ x: "s", y: "t", z: "s" });
        expect(immutableMerge(lhsS, rhsS, UpdateCode.N)).toEqual(lhsS);

        //scalar unset
        lhsS['d'] = "t";
        rhsS['d'] = undefined;
        expect(immutableMerge(lhsS, rhsS, UpdateCode.D)).toEqual({ y: "t", z: "t" });
        expect(immutableMerge(lhsS, rhsS, UpdateCode.U)).toEqual({ y: "t", z: "s" });
        expect(immutableMerge(lhsS, rhsS, UpdateCode.Y)).toEqual({ x: "s", y: "t", z: "s" });
        expect(immutableMerge(lhsS, rhsS, UpdateCode.N)).toEqual(lhsS);

    });

    test('should merge vector fields with update code', async () => {

        const uc = UpdateCode.B;
        const lhs = { a: ["11", "22", "33"], tv: ["t"], ts: "ts" };
        const rhs = { a: ["33", "22", "44"], tv: "s", sv: ["11", "22", "11"], ss: "ss" };
        const lhsCopy = deepClone(lhs);
        const rhsCopy = deepClone(rhs);

        expect(immutableMerge(lhs, lhs, UpdateCode.Y, UpdateCode.XR)).toMatchObject(lhs);
        expect(immutableMerge(lhs, {}, UpdateCode.Y, UpdateCode.XR)).toMatchObject(lhs);
        expect(immutableMerge({}, lhs, UpdateCode.Y, UpdateCode.XR)).toMatchObject(lhs);

        //vector set operations
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XM).a).toEqual(["11", "22", "33", "44"]);
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XD).a).toEqual(["11"]);
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XI).a).toEqual(["22", "33"]);
        //vector collections
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XR).a).toEqual(["33", "22", "44"]);
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XS).a).toEqual(["11", "22", "33", "33", "22", "44"]);
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XF).a).toEqual(["33", "22", "44", "11", "22", "33"]);

        //scalar into vector
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XR).tv).toEqual(["s"]);
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XS).tv).toEqual(["t", "s"]);
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XF).tv).toEqual(["s", "t"]);
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XM).tv).toEqual(["t", "s"]);
        expect(immutableMerge(lhs, { tv: "t" }, uc, UpdateCode.XI).tv).toEqual(["t"]);
        expect(immutableMerge(lhs, { tv: "s" }, uc, UpdateCode.XI).tv).toEqual(undefined);
        expect(immutableMerge(lhs, { tv: "t" }, uc, UpdateCode.XD).tv).toEqual(undefined);
        expect(immutableMerge(lhs, { tv: "s" }, uc, UpdateCode.XD).tv).toEqual(["t"]);

        //vector into empty
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XM).sv).toEqual(["11", "22"]);
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XD).sv).toEqual(undefined);
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XI).sv).toEqual(undefined);
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XR).sv).toEqual(rhs.sv);
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XS).sv).toEqual(rhs.sv);
        expect(immutableMerge(lhs, rhs, uc, UpdateCode.XF).sv).toEqual(rhs.sv);

        //no side effects
        expect(lhsCopy).toMatchObject(lhs);
        expect(rhsCopy).toMatchObject(rhs);

    });

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
