/**
 * ts-jest rather than next/jest: these are pure-logic tests — the domain rules,
 * the tenant SSOT, the stylesheet that must agree with it, and the static
 * checks over db/. No JSX and no DOM, so the lighter node environment is
 * honest about what is being exercised.
 */
module.exports = {
  testEnvironment: 'node',
  // lib/ holds the pure domain; db/ holds the schema and the checks that
  // keep db/rls.sql in step with it. Both are node-environment logic tests.
  testMatch: ['<rootDir>/lib/**/__tests__/**/*.test.ts', '<rootDir>/db/**/__tests__/**/*.test.ts'],
  // The app resolves `@/...` through tsconfig paths; jest needs the same map or
  // any module that reaches one (lib/mock-data -> @/lib/tenant) fails to load.
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: {
    // The app's tsconfig targets the bundler (module: esnext), which Node
    // cannot execute directly — override to commonjs for the test run only.
    // rootDir: TS 6 (TS5011) requires it explicit when the inferred common
    // source directory (only the test files here) would mislay output paths.
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: { module: 'commonjs', esModuleInterop: true, rootDir: '.' } },
    ],
  },
};
