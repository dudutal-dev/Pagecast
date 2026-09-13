import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    env: {
      PAGECAST_MOCK_PROVIDERS: "1",
      PAGECAST_DB_PATH: ":memory:",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/server/**"],
    },
  },
});
