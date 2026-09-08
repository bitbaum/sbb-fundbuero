/**
 * ts-jest rather than next/jest: these are pure-logic tests over the tenant
 * SSOT and the stylesheet that must agree with it. No JSX, no DOM, so the
 * lighter node environment is honest about what is being exercised.
 *
 * The repo's services already use jest 29 + ts-jest, so this keeps ONE test
 * framework across the monorepo instead of introducing a second.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/lib/**/__tests__/**/*.test.ts'],
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
