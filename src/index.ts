
export { deepEquals } from "./datum-utils";
export { deepClone } from "./datum-utils";

export { deepDiffLow } from "./diff-high";
export { deepDiffTyped, antiDiffTyped } from "./diff-high";
export { deepDiffFlat } from "./diff-high";
export { flattenObject, unflattenObject } from "./diff-high";

export { type PatchResult } from "./patch-low";
export { diffToPatchLog, deepPatchLog } from "./patch-low";
export { applyPatchLog, revertPatchLog } from "./patch-low";
export { immutablePatch, getPointerValue } from "./patch-low";

export { UpdateCode } from "./merge-low";
export { UpdateCode as MC } from "./merge-low";
export { type MergeCode } from "./merge-low";
export { updateCodeInfo } from "./merge-high";

export { shallowMerge, immutableMerge } from "./merge-high";
export { deepMerge, immutableDeepMerge } from "./merge-high";
export { diffFromMerge, patchFromMerge } from "./merge-high";

export { type DetailConfig } from "./merge-conf";
export { detailMerge, immutableDetailMerge } from "./merge-conf";
export { type MergeConfig } from "./merge-conf";
export { fillUpdateCodes } from "./merge-conf";
export { customMerge, immutableCustomMerge } from "./merge-conf";
export { bypassMerge } from "./merge-conf";

export { type MergeResult } from "./merge-patch";
export { customMergePatch, bypassMergePatch } from "./merge-patch";
export { deepMergeLog, selectPathCode } from "./merge-patch";

//defaults
export { deepMerge as merge } from "./merge-high";
export { customMerge as mergeDiff } from "./merge-conf";
export * from "./diff-lib/deep-diff";
export { deepDiffLow as deepDiff } from "./diff-high";
