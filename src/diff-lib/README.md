# datum-diff

module recently published as a standalone package [datum-diff](https://www.npmjs.com/package/datum-diff)

works as a drop-in replacement for the deprecated package [deep-diff](https://www.npmjs.com/package/deep-diff)

simply use `datum-diff` instead of the `datum-merge` libary in the examples below .

for usage on browser environments:
```
<script src="https://unpkg.com/datum-diff@1.0.3/dist-diff/umd/deep-diff.min.js"></script>
```

## sources

the source code of the [deep-diff](https://www.npmjs.com/package/deep-diff) js library has been migrated to typescript .
it remains unmaintained and contains some serious bugs that made it unreliable for this project . 

* tag:v1.0.2 flitbit/diff (was github.com/flitbit/diff/blob/master/index.js)
* tag:v1.0.2 flitbit/diff/tests (was github.com/flitbit/diff/blob/master/test/tests.js)
* tag:v1.0.5 [@types/deep-diff](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/deep-diff/index.d.ts)
* tag:v1.0.2 flitbit/Readme.md (was github.com/flitbit/diff/blob/master/Readme.md)
* as of 2026 the links to the original github library are no longer working

same interfaces have been exposed to maintain compatibility with the last version .

many thanks to the library author and all previous contributors !

## usage

recommended to invoke via the wrapper method for simple cases :
```
import { deepDiff } from "datum-merge";
const datumDiff: Partial<MyType> = deepDiff<MyType>(target, source);
```

or use the existing library interfaces now with types : 
```
import { diff, Diff, applyChange } from "datum-merge";
const simpleDiff: Diff[] = diff(target, source);
for (const dif of simpleDiff) { applyChange(target, null, dif); }

import { Diff, accumulateDiff, PreFilter, Accumulator } from "datum-merge";
const customDiff: Diff[] = accumulateDiff(target, source, prefilter, accum, orderIndep);
```

or interface to json-patch from the native diff output :
```
import { applyPatchLog, diffToPatchLog, PatchResult } from "datum-merge";
const patch: PatchResult[] = diffToPatchLog(customDiff, true);
applyPatchLog(patch, target);
```

see the [readme](dd-README.md) migrated from the original library for detailed examples .

## changes

* all functions and responses are typed
* lhs and rhs should be immutable ( had bug when orderIndependent=true )
* diff response should be immutable
* general code upgrades and variable cleanup
* avoid introducing any dependancies within module
* bundled package size is seven times smaller

---
