// jest.config.js
/** @type {import('jest').Config} */
export default {
  preset:                 "ts-jest/presets/default-esm",
  testEnvironment:        "node",
  extensionsToTreatAsEsm: [".ts"],

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module:           "ESNext",
          moduleResolution: "Bundler",
        },
      },
    ],
  },

  testMatch: [
    "**/tests/**/*.test.ts",
    "**/tests/**/*.spec.ts",
  ],

  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/server.ts",
    "!src/config/**",
    "!src/jobs/**",
    "!prisma/**",
  ],

  coverageThreshold: {
    global: {
      branches:   70,
      functions:  70,
      lines:      70,
      statements: 70,
    },
  },

  coverageReporters: ["text", "lcov", "html"],

  clearMocks:   true,
  resetMocks:   true,
  restoreMocks: true,

  globalSetup:    "./tests/setup/globalSetup.ts",
  globalTeardown: "./tests/setup/globalTeardown.ts",
};