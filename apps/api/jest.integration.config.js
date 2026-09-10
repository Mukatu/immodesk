/** Tests d'intégration : nécessitent la pile Docker (PostgreSQL + Redis). */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/integration/**/*.int-spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/test/integration/setup-env.ts'],
  testTimeout: 60_000,
  maxWorkers: 1,
  clearMocks: true,
  forceExit: true,
};
