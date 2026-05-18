import { resolve } from "path";
import { defineConfig } from "vite";
import preloadTemplates from "./vite-plugin-preload-templates";

export default defineConfig({
    build: {
        target: "ES2022",
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
		        dashboard: resolve(__dirname, "dashboard/index.html"),
                playground: resolve(__dirname, "playground/index.html"),
                instructions: resolve(__dirname, "instructions/index.html"),
                leaderboard: resolve(__dirname, "leaderboard/index.html"),
                'leaderboard/graph': resolve(__dirname, "leaderboard/graph/index.html"),
                replay: resolve(__dirname, "replay/index.html"),
                follow: resolve(__dirname, "follow/index.html"),
                summary: resolve(__dirname, "summary/index.html"),
                'summary/graph': resolve(__dirname, "summary/graph/index.html"),
                login: resolve(__dirname, "auth/login/index.html"),
                register: resolve(__dirname, "auth/register/index.html"),
                account: resolve(__dirname, "account/index.html"),
            },
        },
        outDir: "../build/client",
        emptyOutDir: true,
    },
    plugins: [preloadTemplates()],
    //assetsInclude: ['**/*.html'], // cannot add this !!!
});
