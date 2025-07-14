import esbuild from "esbuild";
import process from "process";

esbuild.build({
	entryPoints: ['src/index.ts'],
	tsconfig: 'tsconfig.json',
	bundle: true,
	platform: 'browser',
	format: 'iife',
	target: 'es6',
	external: [],
	logLevel: 'info',
	sourcemap: 'external',
	minify: true,
	treeShaking: false,
	legalComments: 'none',
	outfile: 'dist/umd/datum-merge.min.js',
}).catch(() => process.exit(1));
