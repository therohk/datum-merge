import type { Config } from '@jest/types';

export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: [
        '<rootDir>/__tests__/**/*.test.ts',
        // '<rootDir>/__tests__/**/*.test.js',
    ],
    collectCoverage: true,
    coverageDirectory: 'coverage/',
    coverageReporters: ['text'],
    collectCoverageFrom: ['src/**/*.ts'],
    coveragePathIgnorePatterns: [
        '/node_modules',
        '/dist',
        '/src/index.ts',
    ],
    moduleNameMapper: {
        //requires transpilation
        "lodash-es": "lodash",
    },
} as Config.InitialOptions;
