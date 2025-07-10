// ESM-compatible mock helpers
import { jest } from '@jest/globals';

// Create a mock that works with ESM
export function createESMMock(implementation = {}) {
  const mock = {
    ...implementation,
    __esModule: true,
    default: implementation.default || jest.fn()
  };
  
  // Add jest mock functions to all function properties
  Object.keys(mock).forEach(key => {
    if (typeof mock[key] === 'function' && key !== '__esModule') {
      mock[key] = jest.fn(mock[key]);
    }
  });
  
  return mock;
}

// Mock child_process for ESM
export const mockChildProcess = {
  execSync: jest.fn(),
  exec: jest.fn(),
  spawn: jest.fn(),
  spawnSync: jest.fn(),
  fork: jest.fn()
};

// Mock fs for ESM
export const mockFs = {
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  unlinkSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn()
  }
};

// Mock git helpers
export const mockGitHelpers = {
  isGitRepository: jest.fn(),
  getCurrentBranch: jest.fn(),
  getMainBranch: jest.fn(),
  hasUncommittedChanges: jest.fn(),
  getRecentCommits: jest.fn(),
  branchExists: jest.fn(),
  generateBranchName: jest.fn(),
  execGitCommand: jest.fn(),
  getChangedFiles: jest.fn(),
  isBranchBehind: jest.fn(),
  hasRemoteBranch: jest.fn()
};

// Helper to setup common mocks
export function setupCommonMocks() {
  // Default implementations
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue('{}');
  mockGitHelpers.isGitRepository.mockReturnValue(true);
  mockGitHelpers.getCurrentBranch.mockReturnValue('main');
  mockGitHelpers.getMainBranch.mockReturnValue('main');
  mockGitHelpers.hasUncommittedChanges.mockReturnValue(false);
  mockGitHelpers.getRecentCommits.mockReturnValue([]);
  mockGitHelpers.branchExists.mockReturnValue(true);
  mockGitHelpers.execGitCommand.mockReturnValue({ success: true, output: '' });
  
  return {
    mockChildProcess,
    mockFs,
    mockGitHelpers
  };
}