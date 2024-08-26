# datum-merge

**datum-merge** is a modern typescript library that simplifies merge and diff operations for deeply nested objects.

**Source Code** : https://github.com/therohk/datum-merge

**NPM library** : https://www.npmjs.com/package/datum-merge

![](https://github.com/therohk/datum-merge/actions/workflows/build.yml/badge.svg)

---

## Upcoming Features

1. inline entire [deep-diff](https://github.com/flitbit/diff) library which is unmaintained and contains serious bugs.

2. support merging for top level arrays or primitives.

3. project should compile in strict mode.

4. formalize support for deeply nested objects (for v1).

Code contributions are welcome via issues and pull requests.

---

## Sample Usage

```
import { merge, detailMerge, MergeConfig, UpdateCode } from "datum-merge";
const diff = merge(target, source, UpdateCode.B, UpdateCode.XM);
```

## Merge Strategy

This string code describes how modifications to an attribute for a PUT/UPDATE operation should be handled.
It decides whether a change to the value of the field is allowed during a merge operation between two entities.

### Strategy Codes

The same field within a source and target object is represented by `s` and `t` respectively.
Whether the strategy requires data to be present for the field, is shown by { 0=no, 1=yes, X=irrelavant }. 
The value of the source field is migrated to the target field only if the predicate passes.

| Code Value | Predicate | Meaning |
|----|----|----|
| C | n/a | always create new instance |
| T | n/a | touch datum ; empty merge |
| N | `0` | reject any change ; skip merge |
| Y | `sX & tX` | accept any change ; bypass merge |
| B | `s1 & tX` | insert or update, no delete |
| H | `s1 & t1` | update only if exists |
| U | `sX & t1` | update or delete only, no insert |
| I | `sX & t0` | insert only, no update or delete |
| D | `s0 & tX` | delete only, no update or insert |
| XR | `sX & tX` | full vector replacement |
| XM | `s ∪ t`   | set union, vector merge |
| XD | `s - t`   | set difference, delete given values |
| XI | `s ∩ t`   | set intersection, delete missing values |
| XS | `s + t` | preserve order insert (allows dupes) |
| XF | `t + s` | insert from start (allows dupes) |

Applying the merge results in one of these transitions per primitive value in the target object.

| Code Value | Meaning | Transitions |
|----|----|----|
| Z | noop / ignore  | `null <- null` or `non-null == non-null` |
| N | new / insert   | `null <- non-null` |
| E | edit / update  | `non-null <- non-null` |
| D | unset / delete | `non-null <- null` |
| AN | array size increase | `non-null > non-null` |
| AD | array size decrease | `non-null < non-null` |

---
