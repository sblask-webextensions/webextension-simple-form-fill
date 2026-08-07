import {defineConfig} from "@playwright/test";

export default defineConfig({
    expect: {
        timeout: 5_000,
    },
    fullyParallel: false,
    reporter: process.env.CI ? "github" : "list",
    testDir: "./e2e",
    timeout: 30_000,
    use: {
        baseURL: "http://127.0.0.1:4173",
        trace: "retain-on-failure",
    },
    webServer: {
        command: "node e2e/server.js",
        port: 4_173,
        reuseExistingServer: !process.env.CI,
    },
    workers: 1,
});
