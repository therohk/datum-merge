# datum-merge

**datum-merge** is a modern typescript library that simplifies merge and diff operations for deeply nested objects

**Source Code** : https://github.com/therohk/datum-merge

**NPM library** : https://www.npmjs.com/package/datum-merge

![](https://github.com/therohk/datum-merge/actions/workflows/build.yml/badge.svg) ![](https://img.shields.io/github/v/release/therohk/datum-merge)

---

## Sample Usage

Deep merge with default config :
```
import { deepMerge, customMerge, UpdateCode } from "datum-merge";
const changed = deepMerge(target, source, UpdateCode.I, UpdateCode.XM, UpdateCode.B);
//same as
const diff = customMerge(target, source, {
    scalar: UpdateCode.I,
    vector: UpdateCode.XM,
    nested: UpdateCode.B,
});
```

Exact nestable config that ignores all other fields :
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

Deep merge with generic config patterns :
```
import { customMergeDiff, MergeConfig, UpdateCode } from "datum-merge";
const conf: MergeConfig = {
    "*_id": UpdateCode.I,
    scalar: UpdateCode.B,
    field1: UpdateCode.D,
    "arr*": UpdateCode.XM,
    nested: UpdateCode.N,
    obj1: {
        scalar: UpdateCode.B,
        vector: UpdateCode.XM,
    },
};
const changed: boolean = customMerge(target, source, conf);
const diff: Partial<T> = customMergeDiff<T>(target, source, conf);
```

Reversible merge with changelog in json-patch format :
```
import { customMergePatch, MergeResult, revertPatchLog } from "datum-merge";
const conf = { scalar: "I", vector: "XM", nested: "B" };
const patch: MergeResult[] = customMergePatch(target, source, conf);
const changed = revertPatchLog(patch, target);
applyPatchLog(patch, otherTarget); //op replayed, exact paths
forcePatchLog(patch, anotherTarget); //op ignored, nulls deleted
```
---

## Upcoming Features

1. publish diff module as a standalone package ([available](/src/diff-lib/README.md)) .

2. formalize config schema for deeply nested objects (for v1) .

3. option to ignore errors for datatype mismatch during merge .

4. support custom equality check for vector labels .

5. better anti-diff function that retains deep similarities .

Code contributions are welcome via issues and pull requests .

---

## Merge Strategy

This string code describes how modifications to an attribute for a put/update operation should be handled .
It decides whether a change to the value of the field is allowed during a merge between two entities .

### Strategy Codes

The same field within a target and source object is represented by `t` and `s` respectively .
Whether the strategy requires data to be present for the field , is shown by `{ 0=no, 1=yes, X=irrelevant }` . 
The value is migrated from the source field to the target field only if the predicate passes .

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
| XF | `s + t` | insert from front (allows dupes) |

### Diff Codes

Applying a merge transaction may lead to many changes within a target datum .
These can optionally be logged as a [json-patch](https://datatracker.ietf.org/doc/html/rfc6902) array or diff object .

Each value transition is captured at the deepest primitive level as an edit .
Changes affecting keys or array length get captured at the object level .
The boolean `changed` response is further sensitive to cleanups and address shifts .

| Patch Op | Meaning | Rev Code | Transitions |
|----|----|----|----|
| `add`     | new / insert   | I | `null <-- non-null` |
| `remove`  | unset / delete | D | `non-null <-- null` |
| `replace` | edit / update  | H | `non-null <-- non-null` |
| `test`    | noop / skip / ignore | N | `null <-- null` or `non-null == non-null` |

---
