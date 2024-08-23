import { deepClone } from "../src/data-utils";
import { UpdateCode } from "../src/merge-low";
import { immutableMerge } from "../src/merge-high";

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

        // console.log("ord n", deepDiffLow(lhs, rhs));
        // console.log("ord y", deepDiffLow(lhs, rhs, true));
        // console.log("m", { t: lhs, s: rhs });

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
});
