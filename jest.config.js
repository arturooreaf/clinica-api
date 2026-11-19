/** @type {import('jest').Config} */
const transform = {
  "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
};

module.exports = {
  // npm run test:coverage
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/server.ts",
    "!src/database/migrations/**",
    "!src/**/*.d.ts",
  ],
  projects: [
    {
      // Fast tests: the whole HTTP app with the repositories mocked (no database)
      displayName: "unit",
      testEnvironment: "node",
      roots: ["<rootDir>/test"],
      testPathIgnorePatterns: [
        "/node_modules/",
        "/dist/",
        "/test/integration/",
      ],
      setupFiles: ["<rootDir>/test/setup-env.ts"],
      // Every test starts with clean mocks: no leftovers from the previous one
      resetMocks: true,
      transform,
    },
    {
      // Slow tests: real SQL against the clinica_test database
      displayName: "integration",
      testEnvironment: "node",
      roots: ["<rootDir>/test/integration"],
      setupFiles: ["<rootDir>/test/integration/setup-env.ts"],
      transform,
    },
  ],
};
