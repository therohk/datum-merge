import esbuild from "esbuild";
import process from "process";

esbuild.build({
	entryPoints: ['deep-diff.ts'],
	tsconfig: 'tsconfig.lib.json',
	bundle: true,
	platform: 'browser',
	format: 'cjs',
	target: 'es6',
	external: [],
	logLevel: 'info',
	sourcemap: 'external',
	minify: true,
	treeShaking: false,
	outfile: 'dist-diff/umd/deep-diff.min.js',
}).catch(() => process.exit(1));
