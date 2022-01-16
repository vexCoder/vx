const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  roots: [
    '<rootDir>',
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
  ],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '\\.(css|sass|scss)$': 'identity-obj-proxy',
    ...pathsToModuleNameMapper(
      compilerOptions.paths,
      { prefix: '<rootDir>' },
    ),
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
