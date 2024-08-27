
export { deepEquals } from "./datum-utils";
export { deepClone } from "./datum-utils";
export { flattenObject, unflattenObject } from "./datum-utils";

export { deepDiffLow } from "./diff-high";
export { deepDiffFlat } from "./diff-high";
export { deepDiffTyped } from "./diff-high";

export { UpdateCode } from "./merge-low";
export { updateCodeInfo } from "./merge-high";
export { MergeError } from "./merge-high";

export { shallowMerge, immutableMerge } from "./merge-high";
export { diffFromMerge } from "./merge-high";
export { deepMerge, immutableDeepMerge } from "./merge-high";

export { type DetailConfig, } from "./merge-conf";
export { detailMerge, immutableDetailMerge } from "./merge-conf";

//defaults
export { deepMerge as merge } from "./merge-high";
export * from "./diff-lib/deep-diff";
export { deepDiffLow as deepDiff } from "./diff-high";
