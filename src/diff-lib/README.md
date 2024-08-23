
## sources

* tag:v1.0.2 [flitbit/diff](https://github.com/flitbit/diff/blob/master/index.js)
* tag:v1.0.5 [@types/deep-diff](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/deep-diff/index.d.ts)

same interfaces have been exposed to maintain compatibility with last version .
preferred method of invokation is via diff-utils .

many thanks to the library author and all previous contributors !

## changes

* all functions and responses are typed
* lhs and rhs should be immutable ( bug when orderIndependent=true )
* diff response should be immutable
* avoid introducing any dependancies within module
* support importing only diff as drop-in replacement
* should compare nullish keys properly ( todo )
