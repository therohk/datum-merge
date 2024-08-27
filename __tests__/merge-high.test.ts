import { deepClone } from "../src/datum-utils";
import { UpdateCode } from "../src/merge-low";
import { immutableDeepMerge, immutableMerge } from "../src/merge-high";

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

    test('should merge nested fields with update code', async () => {

        const sc = UpdateCode.B;
        const vc = UpdateCode.XM;
        const lhs = { o: { a: ["11", "22", "33"], b: "t", k: "t" }, ox: { n: 1 }, tv: ["t"], ts: "ts" };
        const rhs = { o: { a: ["33", "22", "44"], b: "s" }, ox: { m: "z" }, tv: ["s"], ss: "ss" };

        //fallback to scalar
        expect(immutableMerge(lhs, rhs, sc, vc).o).toMatchObject(rhs.o);

        //nested vector
        expect(immutableDeepMerge(lhs, rhs, sc, vc, UpdateCode.N).o).toMatchObject(lhs.o);
        expect(immutableDeepMerge(lhs, rhs, sc, vc, UpdateCode.Y).o).toMatchObject(rhs.o);
        expect(immutableDeepMerge(lhs, rhs, sc, vc, UpdateCode.XM).o).toMatchObject({ a: ["11", "22", "33", "44"], b: "s", k: "t" });

        //nested object array
        const deepT = { oa: { v: [{ x: "a" }, { c: "z" }, { b: "v" }] }, o: { z: ["a", "b"], b: "t" }, del: "x" };
        const deepS = { oa: { v: [{ y: "b" }, { b: "v" }] }, o: { z: ["c"], b: "s" } };

        expect(immutableDeepMerge(deepS, deepS, sc, UpdateCode.XM, UpdateCode.N)).toMatchObject(deepS);
        expect(immutableDeepMerge(deepT, deepS, UpdateCode.Y, UpdateCode.N, UpdateCode.XR)).toMatchObject(deepS);

        expect(immutableDeepMerge(deepT, deepS, sc, UpdateCode.XS, UpdateCode.N).oa.v.length).toBe(3);
        expect(immutableDeepMerge(deepT, deepS, sc, UpdateCode.XS, UpdateCode.Y).oa.v.length).toBe(2);
        expect(immutableDeepMerge(deepT, deepS, sc, UpdateCode.XM, UpdateCode.I).oa.v.length).toBe(4);
        expect(immutableDeepMerge(deepT, deepS, sc, UpdateCode.XS, UpdateCode.XS).oa.v.length).toBe(5);

        expect(immutableDeepMerge(deepT, deepS, sc, UpdateCode.N, UpdateCode.XI).oa.v.length).toBe(1);
        expect(immutableDeepMerge(deepT, deepS, sc, UpdateCode.N, UpdateCode.XD).oa.v.length).toBe(2);
        expect(immutableDeepMerge(deepT, deepS, sc, UpdateCode.N, UpdateCode.XM).oa.v.length).toBe(4);

    });

});
