
## sources

the source code of the [deep-diff](https://github.com/flitbit/diff) js library has been migrated to typescript .
it remains unmaintained and contains some serious bugs that made it unreliable for this project . 

* tag:v1.0.2 [flitbit/diff](https://github.com/flitbit/diff/blob/master/index.js)
* tag:v1.0.2 [flitbit/diff/tests](https://github.com/flitbit/diff/blob/master/test/tests.js) 
* tag:v1.0.5 [@types/deep-diff](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/deep-diff/index.d.ts)

same interfaces have been exposed to maintain compatibility with last version .
recommended method of invocation for simple use-cases is via diff-utils .

many thanks to the library author and all previous contributors !

## usage

```
import { diff, accumulateDiff } from "datum-merge";
const simpleDiff = diff(target, source);
const customDiff = accumulateDiff(target, source, prefilter, accum, orderIndep);
```

see the [readme](https://github.com/flitbit/diff/blob/master/Readme.md#api-documentation) in the original library for detailed examples .

## changes

* all functions and responses are typed
* lhs and rhs should be immutable ( bug when orderIndependent=true )
* diff response should be immutable
* general code upgrades and variable cleanup
* avoid introducing any dependancies within module
* support importing only diff as drop-in replacement ( todo )

---
