import nextVitals from "eslint-config-next/core-web-vitals";
import { globalIgnores } from "eslint/config";

const eslintConfig = [
  ...nextVitals,
  {
    rules: {
      "@next/next/no-img-element": "off"
    }
  },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts"])
];

export default eslintConfig;
