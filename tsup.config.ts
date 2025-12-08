import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/**/*.mts", "!*/**/*.test.mts", "!src/test-utils.mts"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    format: ["cjs", "esm"],
});
