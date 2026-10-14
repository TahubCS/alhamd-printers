import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        // Integration tests share one database, so run files sequentially
        fileParallelism: false,
        setupFiles: ["tests/setup.ts"],
    },
});
