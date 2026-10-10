import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", ".next/**", ".vinext/**", ".cloudflare/**", "node_modules/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/application/**",
                "@/infrastructure/**",
                "@/presentation/**",
                "@/components/**",
                "@/features/**",
                "@/hooks/**",
                "@/app/**",
                "react",
                "@supabase/**",
              ],
              message: "The domain layer must remain framework- and infrastructure-independent.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/infrastructure/**",
                "@/presentation/**",
                "@/components/**",
                "@/features/**",
                "@/hooks/**",
                "@/app/**",
                "react",
                "@supabase/**",
              ],
              message:
                "The application layer may depend only on domain code and application ports.",
            },
          ],
        },
      ],
    },
  },
);
