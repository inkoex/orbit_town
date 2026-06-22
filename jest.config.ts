import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/default-esm',
  testPathIgnorePatterns: ['/node_modules/', '[.]vitest[.]ts$'],
};
export default jestConfig;
