import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

export default defineConfig({
  input: "./src/index.ts",
  output: [
    {
      file: "./dist/index.js",
      format: "cjs",
    },
  ],
  external: ["chalk", "http2-proxy"],
  plugins: [
    terser({
      output: {
        ascii_only: true, // 仅输出ascii字符
      },
    }),
    typescript({
      compilerOptions: {
        module: "ESNext",
      },
    }),
  ],
});
