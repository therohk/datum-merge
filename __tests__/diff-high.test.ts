
import { deepClone, deepEquals } from "../src/datum-utils";
import { deepDiffLow, deepDiffTyped } from "../src/diff-high";

describe("validate-diff-utils", () => {

    test('objects passed to diff should be immutable', async () => {

        const trg = { arN: ["a"], arD: ["a", "b"], d: "del", e: "old", vD: ["del"], oa: [{ x: "a" }, { b: "b" }], oD: { x: "y" } };
        const src = { arN: ["y", "z"], arD: ["z"], n: "new", e: "new", vN: ["new"], oa: [{ y: "b" }, { b: "b" }], sN: ["1", "2"] };
        const trgBkp = deepClone(trg);
        const srcBkp = deepClone(src);
        expect(deepEquals(trgBkp, trg)).toEqual(true);
        expect(deepEquals(srcBkp, src)).toEqual(true);
        
        const tsDiff = deepDiffLow(trg, src);
        const stDiff = deepDiffLow(src, trg);
        const tsoiDiff = deepDiffLow(trg, src, true);
        const stoiDiff = deepDiffLow(src, trg, true);
        expect(tsDiff).toBeDefined();
        expect(stDiff).toBeDefined();
        expect(tsoiDiff).toBeDefined();
        expect(stoiDiff).toBeDefined();

        const tsDiff1 = deepDiffTyped<any>(trg, src);
        const stDiff1 = deepDiffTyped<any>(src, trg);
        expect(tsDiff1).toBeDefined();
        expect(stDiff1).toBeDefined();
        
        //no side effects
        expect(trg).toEqual(trgBkp);
        expect(src).toEqual(srcBkp);
    });

});
