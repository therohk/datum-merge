
export { deepEquals } from "./datum-utils";
export { deepClone } from "./datum-utils";
export { flattenObject, unflattenObject } from "./datum-utils";

export { deepDiffLow } from "./diff-high";
export { deepDiffFlat } from "./diff-high";
export { deepDiffTyped } from "./diff-high";

export { UpdateCode } from "./merge-low";
export { UpdateCode as MC } from "./merge-low";
export { type MergeCode } from "./merge-low";
export { updateCodeInfo } from "./merge-high";

export { shallowMerge, immutableMerge } from "./merge-high";
export { diffFromMerge } from "./merge-high";
export { deepMerge, immutableDeepMerge } from "./merge-high";

export { type DetailConfig } from "./merge-conf";
export { detailMerge, immutableDetailMerge } from "./merge-conf";
export { type MergeConfig } from "./merge-conf";
export { fillUpdateCodes } from "./merge-conf";
export { customMerge, immutableCustomMerge } from "./merge-conf";

export { type PatchResult } from "./patch-low";
export { diffToPatchLog, asLodashPath } from "./patch-low";
export { deepPatchLog } from "./patch-low";

//defaults
export { deepMerge as merge } from "./merge-high";
export { customMerge as mergeDiff } from "./merge-conf";
export * from "./diff-lib/deep-diff";
export { deepDiffLow as deepDiff } from "./diff-high";
