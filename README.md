# datum-merge

**datum-merge** is a modern typescript library that simplifies merge and diff operations for deeply nested objects.

**Source Code** : https://github.com/therohk/datum-merge

**NPM library** : https://www.npmjs.com/package/datum-merge

![](https://github.com/therohk/datum-merge/actions/workflows/build.yml/badge.svg) ![](https://img.shields.io/github/v/release/therohk/datum-merge)

---

## Sample Usage

Merge with default config:
```
import { merge, customMerge, UpdateCode } from "datum-merge";
const changed = merge(target, source, UpdateCode.I, UpdateCode.XM, UpdateCode.B);
//same as
const diff = customMerge(target, source, {
    scalar: UpdateCode.I,
    vector: UpdateCode.XM,
    nested: UpdateCode.B,
});
```

Exact nestable config that ignores all other fields:
```
import { detailMerge, UpdateCode } from "datum-merge";
const changed = detailMerge(target, source, {
    mykey: UpdateCode.I,
    myarr: UpdateCode.XM,
    anobj: UpdateCode.B,
    myobj: {
        myid: UpdateCode.I,
        vals: UpdateCode.XR,
    },
});
```

Deep merge with generic config patterns:
```
import { customMerge, MergeConfig, UpdateCode } from "datum-merge";
const conf: MergeConfig = {
    "*_id": UpdateCode.I,
    scalar: UpdateCode.B,
    field1: UpdateCode.D,
    "arr*": UpdateCode.XM,
    nested: UpdatedCode.N,
    obj1: {
        scalar: UpdateCode.B,
        vector: UpdateCode.XM,
    },
};
const diff: Partial<T> = customMerge<T>(target, source, conf);
```

Deep merge with diff response in json-patch format:
```
import { customMergePatch, MergeResult, revertPatchLog } from "datum-merge";
const conf = { scalar: "I", vector: "XM", nested: "B" };
const patch: MergeResult[] = customMergePatch(target, source, conf);
revertPatchLog(patch, target);
applyPatchLog(patch, anotherTarget);
//with legacy diff
const pdiff = diffToPatchLog(diff(target, source), true);
```
---

## Upcoming Features

1. publish [deep-diff](https://github.com/flitbit/diff) library as a standalone package. ([available](/src/diff-lib/README.md))

2. formalize config schema for deeply nested objects (for v1).

3. option to ignore errors for datatype mismatch during merge.

4. support custom equality check within vector merge.

5. support merging for top level arrays or primitives.

Code contributions are welcome via issues and pull requests.

---

## Merge Strategy

This string code describes how modifications to an attribute for a PUT/UPDATE operation should be handled.
It decides whether a change to the value of the field is allowed during a merge between two entities.

### Strategy Codes

The same field within a target and source object is represented by `t` and `s` respectively.
Whether the strategy requires data to be present for the field, is shown by { 0=no, 1=yes, X=irrelavant }. 
The value is migrated from the source field to the target field only if the predicate passes.

| Code | Predicate | Meaning |
|----|----|----|
| C | n/a | always create new instance |
| T | n/a | touch datum ; empty merge |
| N | `0` | reject any change ; skip merge |
| Y | `tX & sX` | accept any change ; bypass merge |
| B | `tX & s1` | insert or update, no delete |
| H | `t1 & s1` | update only if exists |
| U | `t1 & sX` | update or delete only, no insert |
| I | `t0 & sX` | insert only, no update or delete |
| D | `tX & s0` | delete only, no update or insert |
| XR | `tX & sX` | full vector replacement |
| XM | `t ∪ s`   | set union, vector merge |
| XD | `t - s`   | set difference, delete given values |
| XI | `t ∩ s`   | set intersection, delete missing values |
| XS | `t + s` | preserve order insert (allows dupes) |
| XF | `s + t` | insert from start (allows dupes) |

### Diff Codes

Applying the merge results in one of these transitions per primitive value in the target object.

| Patch Op | Meaning | Rev Code | Transitions |
|----|----|----|----|
| `add`     | new / insert   | I | `null <-- non-null` |
| `replace` | edit / update  | H | `non-null <-- non-null` |
| `remove`  | unset / delete | D | `non-null <-- null` |
| `test`    | noop / skip / ignore (tbd) | N | `null <-- null` or `non-null == non-null` |

---
