import { build } from "esbuild";

await build({
  entryPoints: ["packages/crypto-client/src/index.ts"],
  outfile: "dist/secure-runtime.js",
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: false,
  legalComments: "none"
});
