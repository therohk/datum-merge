# datum-diff

now published as a standalone package [datum-diff](https://www.npmjs.com/package/datum-diff)
works as a drop-in replacement for package [deep-diff](https://www.npmjs.com/package/deep-diff)

```
import { diff, Diff, applyChange } from "datum-merge";
const simpleDiff: Diff[] = diff(target, source);
for (const dif of simpleDiff) { applyChange(target, null, dif); }
```

## sources

the source code of the [deep-diff](https://github.com/flitbit/diff) js library has been migrated to typescript .
it remains unmaintained and contains some serious bugs that made it unreliable for this project . 

* tag:v1.0.2 [flitbit/diff](https://github.com/flitbit/diff/blob/master/index.js)
* tag:v1.0.2 [flitbit/diff/tests](https://github.com/flitbit/diff/blob/master/test/tests.js) 
* tag:v1.0.5 [@types/deep-diff](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/deep-diff/index.d.ts)

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

see the [readme](https://github.com/flitbit/diff/blob/master/Readme.md#api-documentation) in the original library for detailed examples .

## changes

* all functions and responses are typed
* lhs and rhs should be immutable ( had bug when orderIndependent=true )
* diff response should be immutable
* general code upgrades and variable cleanup
* avoid introducing any dependancies within module
* bundled package size is seven times smaller

---
