import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["@testing-library/jest-dom", "<rootDir>/src/__mocks__/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|scss)$": "<rootDir>/src/__mocks__/fileMock.ts",
  },
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
  testMatch: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
  coverageDirectory: "coverage",
};

export default config;
