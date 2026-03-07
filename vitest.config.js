"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/unit/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        testTimeout: 20000,
        hookTimeout: 20000,
    },
});
