
export { deepEquals } from "./datum-utils";
export { flattenObject, unflattenObject } from "./datum-utils";

export { deepDiffLow } from "./diff-high";
export { deepDiffFlat } from "./diff-high";
export { deepDiffTyped } from "./diff-high";

export { UpdateCode } from "./merge-low";
export { updateCodeInfo } from "./merge-high";
export { MergeError } from "./merge-high";

export { shallowMerge, immutableMerge } from "./merge-high";
export { diffFromMerge } from "./merge-high";
export { type DetailConfig, } from "./merge-high";
export { detailMerge, immutableDetailMerge } from "./merge-high";

//defaults
export { shallowMerge as merge } from "./merge-high";
export { deepDiffLow as diff } from "./diff-high";
