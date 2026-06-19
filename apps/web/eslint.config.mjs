import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Las comillas/apóstrofes en texto JSX se renderizan igual estén escapadas
      // o no; esta regla genera fricción sin beneficio real. Desactivada a
      // propósito (revertir si se quiere reimponer el escapado).
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
