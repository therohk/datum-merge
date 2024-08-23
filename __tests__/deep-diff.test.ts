import { PreFilterObject, accumulateDiff, applyChange, applyDiff, diff, getOrderIndependentHash, orderIndependentDiff, revertChange } from "../src/diff-lib/deep-diff";

describe('validate-diff-lib', function () {
    const empty = {};

    describe('A target that has no properties', function () {

        it('shows no differences when compared to another empty object', function () {
            expect(diff(empty, {})).not.toBeDefined();
        });

        describe('when compared to a different type of keyless object', function () {
            const comparandTuples = [
                ['an array', {
                    key: []
                }],
                ['an object', {
                    key: {}
                }],
                ['a date', {
                    key: new Date()
                }],
                ['a null', {
                    key: null
                }],
                ['a regexp literal', {
                    key: /a/
                }],
                ['Math', {
                    key: Math
                }]
            ];

            comparandTuples.forEach(function (lhsTuple) {
                comparandTuples.forEach(function (rhsTuple) {
                    if (lhsTuple[0] === rhsTuple[0]) {
                        return;
                    }
                    it('shows differences when comparing ' + lhsTuple[0] + ' to ' + rhsTuple[0], function () {
                        const changes = diff(lhsTuple[1], rhsTuple[1]);
                        expect(changes).toBeDefined();
                        expect(changes.length).toBe(1);
                        expect(changes[0]).toHaveProperty('kind');
                        expect(changes[0].kind).toBe('E');
                    });
                });
            });
        });

        describe('when compared with an object having other properties', function () {
            const comparand = {
                other: 'property',
                another: 13.13
            };
            const changes: any = diff(empty, comparand);

            it('the differences are reported', function () {
                expect(changes).toBeDefined();
                expect(changes.length).toBe(2);

                expect(changes[0]).toHaveProperty('kind');
                expect(changes[0].kind).toBe('N');
                expect(changes[0]).toHaveProperty('path');
                expect(changes[0].path).toBeInstanceOf(Array);
                expect(changes[0].path[0]).toEqual('other');
                expect(changes[0]).toHaveProperty('rhs');
                expect(changes[0].rhs).toBe('property');

                expect(changes[1]).toHaveProperty('kind');
                expect(changes[1].kind).toBe('N');
                expect(changes[1]).toHaveProperty('path');
                expect(changes[1].path).toBeInstanceOf(Array);
                expect(changes[1].path[0]).toEqual('another');
                expect(changes[1]).toHaveProperty('rhs');
                expect(changes[1].rhs).toBeCloseTo(13.13);
            });

        });

    });

    describe('A target that has one property', function () {
        const lhs = {
            one: 'property'
        };

        it('shows no differences when compared to itself', function () {
            expect(diff(lhs, lhs)).not.toBeDefined();
        });

        it('shows the property as removed when compared to an empty object', function () {
            const changes = diff(lhs, empty);
            expect(changes).toBeDefined();
            expect(changes.length).toBe(1);
            expect(changes[0]).toHaveProperty('kind');
            expect(changes[0].kind).toBe('D');
        });

        it('shows the property as edited when compared to an object with null', function () {
            const changes = diff(lhs, {
                one: null
            });
            expect(changes).toBeDefined();
            expect(changes.length).toBe(1);
            expect(changes[0]).toHaveProperty('kind');
            expect(changes[0].kind).toBe('E');
        });

        it('shows the property as edited when compared to an array', function () {
            const changes = diff(lhs, ['one']);
            expect(changes).toBeDefined();
            expect(changes.length).toBe(1);
            expect(changes[0]).toHaveProperty('kind');
            expect(changes[0].kind).toBe('E');
        });

    });

    describe('A target that has null value', function () {
        const lhs = {
            key: null
        };

        it('shows no differences when compared to itself', function () {
            expect(diff(lhs, lhs)).not.toBeDefined();
        });

        it('shows the property as removed when compared to an empty object', function () {
            const changes = diff(lhs, empty);
            expect(changes).toBeDefined();
            expect(changes.length).toBe(1);
            expect(changes[0]).toHaveProperty('kind');
            expect(changes[0].kind).toBe('D');
        });

        it('shows the property is changed when compared to an object that has value', function () {
            const changes = diff(lhs, {
                key: 'value'
            });
            expect(changes).toBeDefined();
            expect(changes.length).toBe(1);
            expect(changes[0]).toHaveProperty('kind');
            expect(changes[0].kind).toBe('E');
        });

        it('shows that an object property is changed when it is set to null', function () {
            (lhs as any).key = {
                nested: 'value'
            };
            const changes = diff(lhs, {
                key: null
            });
            expect(changes).toBeDefined();
            expect(changes.length).toBe(1);
            expect(changes[0]).toHaveProperty('kind');
            expect(changes[0].kind).toBe('E');
        });

    });

    describe('A target that has a date value', function () {
        const lhs = {
            key: new Date(555555555555)
        };

        it('shows the property is changed with a new date value', function () {
            const changes = diff(lhs, {
                key: new Date(777777777777)
            });
            expect(changes).toBeDefined();
            expect(changes.length).toBe(1);
            expect(changes[0]).toHaveProperty('kind');
            expect(changes[0].kind).toBe('E');
        });

    });

    describe('A target that has a NaN', function () {
        const lhs = {
            key: NaN
        };

        it('shows the property is changed when compared to another number', function () {
            const changes = diff(lhs, {
                key: 0
            });
            expect(changes).toBeDefined();
            expect(changes.length).toBe(1);
            expect(changes[0]).toHaveProperty('kind');
            expect(changes[0].kind).toBe('E');
        });

        it('shows no differences when compared to another NaN', function () {
            const changes = diff(lhs, {
                key: NaN
            });
            expect(changes).not.toBeDefined();
        });

    });

    describe('When filtering keys', function () {
        const lhs = {
            enhancement: 'Filter/Ignore Keys?',
            numero: 11,
            submittedBy: 'ericclemmons',
            supportedBy: ['ericclemmons'],
            status: 'open'
        };
        const rhs = {
            enhancement: 'Filter/Ignore Keys?',
            numero: 11,
            submittedBy: 'ericclemmons',
            supportedBy: [
                'ericclemmons',
                'TylerGarlick',
                'flitbit',
                'ergdev'
            ],
            status: 'closed',
            fixedBy: 'flitbit'
        };

        describe('if the filtered property is an array', function () {

            it('changes to the array do not appear as a difference', function () {
                const prefilter = function (path, key) {
                    return key === 'supportedBy';
                };
                const changes = accumulateDiff(lhs, rhs, prefilter);
                expect(changes).toBeDefined();
                expect(changes.length).toBe(2);
                expect(changes[0]).toHaveProperty('kind');
                expect(changes[0].kind).toBe('E');
                expect(changes[1]).toHaveProperty('kind');
                expect(changes[1].kind).toBe('N');
            });

        });

        describe('if the filtered config is passed as an object', function () {

            it('changes to the array to not appear as a difference', function () {
                const prefilter = function (path, key) {
                    return key === 'supportedBy';
                };
                const changes = accumulateDiff(lhs, rhs, { prefilter: prefilter });
                expect(changes).toBeDefined();
                expect(changes.length).toBe(2);
                expect(changes[0]).toHaveProperty('kind');
                expect(changes[0].kind).toBe('E');
                expect(changes[1]).toHaveProperty('kind');
                expect(changes[1].kind).toBe('N');
            });

        });

        describe('if the filtered property is not an array', function () {

            it('changes do not appear as a difference', function () {
                const prefilter = function (path, key) {
                    return key === 'fixedBy';
                };
                const changes = accumulateDiff(lhs, rhs, prefilter);
                expect(changes).toBeDefined();
                expect(changes.length).toBe(4);
                expect(changes[0]).toHaveProperty('kind');
                expect(changes[0].kind).toBe('A');
                expect(changes[1]).toHaveProperty('kind');
                expect(changes[1].kind).toBe('A');
                expect(changes[2]).toHaveProperty('kind');
                expect(changes[2].kind).toBe('A');
                expect(changes[3]).toHaveProperty('kind');
                expect(changes[3].kind).toBe('E');
            });

        });
    });

    describe('Can normalize properties to before diffing', function () {
        const testLHS = {
            array: [1, 2, 3, 4, 5],
        };

        const testRHS = {
            array: '1/2/3/4/5',
        };

        it('changes do not appear as a difference', function () {
            const filter: PreFilterObject<any, any> = {
                normalize: function (path, key, lhs, rhs) {
                    expect(key).toBe('array');

                    if (Array.isArray(lhs)) {
                        lhs = lhs.join('/');
                    }
                    if (Array.isArray(rhs)) {
                        rhs = rhs.join('/');
                    }
                    return [lhs, rhs];
                }
            };

            const diffLR = accumulateDiff(testLHS, testRHS, filter);
            expect(diffLR).not.toBeDefined();

            const diffRL = accumulateDiff(testRHS, testLHS, filter);
            expect(diffRL).not.toBeDefined();
        });

        it('falsy return does not normalize', function () {
            const filter: PreFilterObject<any, any> = {
                // eslint-disable-next-line no-unused-vars
                normalize: function (path, key, lhs, rhs) {
                    return false;
                }
            };

            const diffLR = accumulateDiff(testLHS, testRHS, filter);
            expect(diffLR).toBeDefined();

            const diffRL = accumulateDiff(testRHS, testLHS, filter);
            expect(diffRL).toBeDefined();
        });
    });

    describe('A target that has nested values', function () {
        const nestedOne = {
            noChange: 'same',
            levelOne: {
                levelTwo: 'value'
            },
            arrayOne: [{
                objValue: 'value'
            }]
        };
        const nestedTwo = {
            noChange: 'same',
            levelOne: {
                levelTwo: 'another value'
            },
            arrayOne: [{
                objValue: 'new value'
            }, {
                objValue: 'more value'
            }]
        };

        it('shows no differences when compared to itself', function () {
            expect(diff(nestedOne, nestedOne)).not.toBeDefined();
        });

        it('shows the property as removed when compared to an empty object', function () {
            const changes = accumulateDiff(nestedOne, empty);
            expect(changes).toBeDefined();
            expect(changes.length).toBe(3);
            expect(changes[0]).toHaveProperty('kind');
            expect(changes[0].kind).toBe('D');
            expect(changes[1]).toHaveProperty('kind');
            expect(changes[1].kind).toBe('D');
        });

        it('shows the property is changed when compared to an object that has value', function () {
            const changes = diff(nestedOne, nestedTwo);
            expect(changes).toBeDefined();
            expect(changes.length).toBe(3);
        });

        it('shows the property as added when compared to an empty object on left', function () {
            const changes = diff(empty, nestedOne);
            expect(changes).toBeDefined();
            expect(changes.length).toBe(3);
            expect(changes[0]).toHaveProperty('kind');
            expect(changes[0].kind).toBe('N');
        });

        describe('when diff is applied to a different empty object', function () {
            const changes = diff(nestedOne, nestedTwo);

            it('has result with nested values', function () {
                const result: any = {};

                applyChange(result, nestedTwo, changes[0]);
                expect(result.levelOne).toBeDefined();
                expect(typeof result.levelOne).toBe('object');
                expect(result.levelOne.levelTwo).toBeDefined();
                expect(result.levelOne.levelTwo).toEqual('another value');
            });

            it('has result with array object values', function () {
                const result: any = {};

                applyChange(result, nestedTwo, changes[2]);
                expect(result.arrayOne).toBeDefined();
                expect(result.arrayOne).toBeInstanceOf(Array);
                expect(result.arrayOne[0]).toBeDefined();
                expect(result.arrayOne[0].objValue).toBeDefined();
                expect(result.arrayOne[0].objValue).toEqual('new value');
            });

            it('has result with added array objects', function () {
                const result: any = {};

                applyChange(result, nestedTwo, changes[1]);
                expect(result.arrayOne).toBeDefined();
                expect(result.arrayOne).toBeInstanceOf(Array);
                expect(result.arrayOne[1]).toBeDefined();
                expect(result.arrayOne[1].objValue).toBeDefined();
                expect(result.arrayOne[1].objValue).toEqual('more value');
            });
        });
    });

    describe('Comparing regexes should work', function () {
        const lhs = /foo/;
        const rhs = /foo/i;

        it('can compare regex instances', function () {
            const changes: any = diff(lhs, rhs);

            expect(changes.length).toBe(1);

            expect(changes[0].kind).toBe('E');
            expect(changes[0].path).toHaveLength(0);
            expect(changes[0].lhs).toBe('/foo/');
            expect(changes[0].rhs).toBe('/foo/i');
        });
    });

    describe('subject.toString is not a function', function () {
        const lhs = {
            left: 'yes',
            right: 'no',
        };
        const rhs = {
            left: {
                toString: true,
            },
            right: 'no',
        };

        it('should not throw a TypeError', function () {
            const changes = diff(lhs, rhs);

            expect(changes.length).toBe(1);
        });
    });

    describe('regression test for issue #10, ', function () {
        const lhs = {
            id: 'Release',
            phases: [{
                id: 'Phase1',
                tasks: [{
                    id: 'Task1'
                }, {
                    id: 'Task2'
                }]
            }, {
                id: 'Phase2',
                tasks: [{
                    id: 'Task3'
                }]
            }]
        };
        const rhs = {
            id: 'Release',
            phases: [{
                // E: Phase1 -> Phase2
                id: 'Phase2',
                tasks: [{
                    id: 'Task3'
                }]
            }, {
                id: 'Phase1',
                tasks: [{
                    id: 'Task1'
                }, {
                    id: 'Task2'
                }]
            }]
        };

        describe('differences in nested arrays are detected', function () {
            const changes = diff(lhs, rhs);

            // there should be differences
            expect(changes).toBeDefined();
            expect(changes.length).toBe(6);

            it('differences can be applied', function () {
                const applied = applyDiff(lhs, rhs);

                expect(applied).toEqual(rhs);
            });
        });

    });

    describe('regression test for issue #35', function () {
        const lhs = ['a', 'a', 'a'];
        const rhs = ['a'];

        it('can apply diffs between two top level arrays', function () {
            const differences = diff(lhs, rhs);

            differences.forEach(function (it) {
                applyChange(lhs, true, it);
            });
            expect(lhs).toEqual(['a']);

            differences.forEach(function (it) {
                revertChange(lhs, true, it);
            });
            expect(lhs).toEqual(['a', 'a', 'a']);
        });
    });

    describe('regression test for issue #83', function () {
        const lhs = {
            date: null
        };
        const rhs = {
            date: null
        };

        it('should not detect a difference', function () {
            expect(diff(lhs, rhs)).not.toBeDefined();
        });
    });

    describe('regression test for issue #70', function () {

        it('should detect a difference with undefined property on lhs', function () {
            const changes: any = diff({ foo: undefined }, {});

            expect(changes).toBeInstanceOf(Array);
            expect(changes.length).toBe(1);

            expect(changes[0].kind).toBe('D');
            expect(changes[0].path).toBeInstanceOf(Array);
            expect(changes[0].path).toHaveLength(1);
            expect(changes[0].path[0]).toBe('foo');
            expect(changes[0].lhs).not.toBeDefined();

        });

        it('should detect a difference with undefined property on rhs', function () {
            const changes: any = diff({}, { foo: undefined });

            expect(changes).toBeInstanceOf(Array);
            expect(changes.length).toBe(1);

            expect(changes[0].kind).toBe('N');
            expect(changes[0].path).toBeInstanceOf(Array);
            expect(changes[0].path).toHaveLength(1);
            expect(changes[0].path[0]).toBe('foo');
            expect(changes[0].rhs).not.toBeDefined();

        });
    });

    describe('regression test for issue #98', function () {
        const lhs = { foo: undefined };
        const rhs = { foo: undefined };

        it('should not detect a difference with two undefined property values', function () {
            const changes = diff(lhs, rhs);

            expect(changes).not.toBeDefined();

        });
    });

    describe('regression tests for issue #102', function () {
        it('should not throw a TypeError', function () {
            const changes: any = diff(null, undefined);

            expect(changes).toBeInstanceOf(Array);
            expect(changes.length).toBe(1);
            expect(changes[0].kind).toBe('D');
            expect(changes[0].lhs).toBe(null);

        });

        it('should not throw a TypeError', function () {
            const changes: any = diff(Object.create(null), { foo: undefined });

            expect(changes).toBeInstanceOf(Array);
            expect(changes.length).toBe(1);
            expect(changes[0].kind).toBe('N');
            expect(changes[0].rhs).not.toBeDefined();
        });
    });

    describe('order independent hash testing', function () {
        function sameHash(a: any, b: any) {
            expect(getOrderIndependentHash(a)).toEqual(getOrderIndependentHash(b));
        }

        function differentHash(a: any, b: any) {
            expect(getOrderIndependentHash(a)).not.toEqual(getOrderIndependentHash(b));
        }

        describe('Order indepdendent hash function should give different values for different objects', function () {
            it('should give different values for different "simple" types', function () {
                differentHash(1, -20);
                differentHash('foo', 45);
                differentHash('pie', 'something else');
                differentHash(1.3332, 1);
                differentHash(1, null);
                differentHash('this is kind of a long string, don\'t you think?', 'the quick brown fox jumped over the lazy doge');
                differentHash(true, 2);
                differentHash(false, 'flooog');
            });

            it('should give different values for string and object with string', function () {
                differentHash('some string', { key: 'some string' });
            });

            it('should give different values for number and array', function () {
                differentHash(1, [1]);
            });

            it('should give different values for string and array of string', function () {
                differentHash('string', ['string']);
            });

            it('should give different values for boolean and object with boolean', function () {
                differentHash(true, { key: true });
            });

            it('should give different values for different arrays', function () {
                differentHash([1, 2, 3], [1, 2]);
                differentHash([1, 4, 5, 6], ['foo', 1, true, undefined]);
                differentHash([1, 4, 6], [1, 4, 7]);
                differentHash([1, 3, 5], ['1', '3', '5']);
            });

            it('should give different values for different objects', function () {
                differentHash({ key: 'value' }, { other: 'value' });
                differentHash({ a: { b: 'c' } }, { a: 'b' });
            });

            it('should differentiate between arrays and objects', function () {
                differentHash([1, true, '1'], { a: 1, b: true, c: '1' });
            });
        });

        describe('Order independent hash function should work in pathological cases', function () {
            it('should work in funky javascript cases', function () {
                differentHash(undefined, null);
                differentHash(0, undefined);
                differentHash(0, null);
                differentHash(0, false);
                differentHash(0, []);
                differentHash('', []);
                differentHash(3.22, '3.22');
                differentHash(true, 'true');
                differentHash(false, 0);
            });

            it('should work on empty array and object', function () {
                differentHash([], {});
            });

            it('should work on empty object and undefined', function () {
                differentHash({}, undefined);
            });

            it('should work on empty array and array with 0', function () {
                differentHash([], [0]);
            });
        });

        describe('Order independent hash function should be order independent', function () {
            it('should not care about array order', function () {
                sameHash([1, 2, 3], [3, 2, 1]);
                sameHash(['hi', true, 9.4], [true, 'hi', 9.4]);
            });

            it('should not care about key order in an object', function () {
                sameHash({ foo: 'bar', foz: 'baz' }, { foz: 'baz', foo: 'bar' });
            });

            it('should work with complicated objects', function () {
                const obj1 = {
                    foo: 'bar',
                    faz: [
                        1,
                        'pie',
                        {
                            food: 'yum'
                        }
                    ]
                };
                const obj2 = {
                    faz: [
                        'pie',
                        {
                            food: 'yum'
                        },
                        1
                    ],
                    foo: 'bar'
                };

                sameHash(obj1, obj2);
            });
        });
    });

    describe('order indepedent array comparison should work', function () {
        it('can compare simple arrays in an order independent fashion', function () {
            const lhs = [1, 2, 3];
            const rhs = [1, 3, 2];

            const changes = orderIndependentDiff(lhs, rhs);
            expect(changes).not.toBeDefined();
        });

        it('still works with repeated elements', function () {
            const lhs = [1, 1, 2];
            const rhs = [1, 2, 1];

            const changes = orderIndependentDiff(lhs, rhs);
            expect(changes).not.toBeDefined();
        });

        it('works on complex objects', function () {
            const obj1 = {
                foo: 'bar',
                faz: [
                    1,
                    'pie',
                    {
                        food: 'yum'
                    }
                ]
            };
            const obj2 = {
                faz: [
                    'pie',
                    {
                        food: 'yum'
                    },
                    1
                ],
                foo: 'bar'
            };

            const changes = orderIndependentDiff(obj1, obj2);
            expect(changes).not.toBeDefined();
        });

        it('should report some difference in non-equal arrays', function () {
            const lhs = [1, 2, 3];
            const rhs = [2, 2, 3];

            const changes = orderIndependentDiff(lhs, rhs);
            expect(changes.length).toBeDefined();
        });

    });

});

describe('Diff-ing symbol-based keys should work', function () {
    const lhs = {
        [Symbol.iterator]: 'Iterator',
        foo: 'bar'
    };
    const rhs = {
        foo: 'baz'
    };

    const changes = diff(lhs, rhs);
    expect(changes).toBeDefined();
    expect(changes).toBeInstanceOf(Array);
    expect(changes).toHaveLength(2);

    let changed = 0, deleted = 0;
    for (const difference of changes) {
        if (difference.kind === 'D') {
            deleted += 1;
        } else if (difference.kind === 'E') {
            changed += 1;
        }
    }

    expect(changed).toBe(1);
    expect(deleted).toBe(1);
});
