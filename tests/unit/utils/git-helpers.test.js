import { jest } from '@jest/globals';
import { execSync } from 'child_process';
import {
  isGitRepository,
  getCurrentBranch,
  getMainBranch,
  hasUncommittedChanges,
  getRecentCommits,
  branchExists,
  generateBranchName,
  execGitCommand,
  getChangedFiles,
  isBranchBehind,
  hasRemoteBranch
} from '../../../src/utils/git-helpers.js';

// Manual mocks are automatically loaded from __mocks__ directory
jest.mock('child_process');

describe('Git Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isGitRepository', () => {
    it('should return true when in a git repository', () => {
      execSync.mockReturnValue('');

      const result = isGitRepository();
      expect(result).toBe(true);
      expect(execSync).toHaveBeenCalledWith('git rev-parse --git-dir', { stdio: 'pipe' });
    });

    it('should return false when not in a git repository', () => {
      execSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      const result = isGitRepository();
      expect(result).toBe(false);
    });
  });

  describe('getCurrentBranch', () => {
    it('should return the current branch name using --show-current', () => {
      execSync.mockReturnValue('feature/test\n');

      const result = getCurrentBranch();
      expect(result).toBe('feature/test');
      expect(execSync).toHaveBeenCalledWith(
        'git branch --show-current',
        expect.any(Object)
      );
    });

    it('should fallback to rev-parse if --show-current fails', () => {
      execSync
        .mockImplementationOnce(() => {
          throw new Error('unrecognized option');
        })
        .mockReturnValueOnce('main\n');

      const result = getCurrentBranch();
      expect(result).toBe('main');
      expect(execSync).toHaveBeenCalledTimes(2);
      expect(execSync).toHaveBeenNthCalledWith(2,
        'git rev-parse --abbrev-ref HEAD',
        expect.any(Object)
      );
    });

    it('should parse branch from git status as last resort', () => {
      execSync
        .mockImplementationOnce(() => {
          throw new Error('error');
        })
        .mockImplementationOnce(() => {
          throw new Error('error');
        })
        .mockReturnValueOnce('On branch develop\nnothing to commit');

      const result = getCurrentBranch();
      expect(result).toBe('develop');
    });

    it('should return empty string if all methods fail', () => {
      execSync.mockImplementation(() => {
        throw new Error('error');
      });

      const result = getCurrentBranch();
      expect(result).toBe('');
    });
  });

  describe('getMainBranch', () => {
    it('should get default branch from remote', () => {
      execSync.mockReturnValue('refs/remotes/origin/main\n');

      const result = getMainBranch();
      expect(result).toBe('main');
    });

    it('should check for main branch locally if remote fails', () => {
      execSync
        .mockImplementationOnce(() => {
          throw new Error('no remote');
        })
        .mockReturnValueOnce(''); // main exists

      const result = getMainBranch();
      expect(result).toBe('main');
    });

    it('should check for master branch if main doesn\'t exist', () => {
      execSync
        .mockImplementationOnce(() => {
          throw new Error('no remote');
        })
        .mockImplementationOnce(() => {
          throw new Error('main not found');
        })
        .mockReturnValueOnce(''); // master exists

      const result = getMainBranch();
      expect(result).toBe('master');
    });

    it('should default to main if nothing exists', () => {
      execSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const result = getMainBranch();
      expect(result).toBe('main');
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return true when there are uncommitted changes', () => {
      execSync.mockReturnValue('M  src/file.js\n?? new-file.txt\n');

      const result = hasUncommittedChanges();
      expect(result).toBe(true);
    });

    it('should return false when working directory is clean', () => {
      execSync.mockReturnValue('');

      const result = hasUncommittedChanges();
      expect(result).toBe(false);
    });

    it('should return false on error', () => {
      execSync.mockImplementation(() => {
        throw new Error('git error');
      });

      const result = hasUncommittedChanges();
      expect(result).toBe(false);
    });
  });

  describe('getRecentCommits', () => {
    it('should return parsed recent commits', () => {
      const mockLog = 
        'abc123 Initial commit\n' +
        'def456 Add new feature';

      execSync.mockReturnValue(mockLog);

      const result = getRecentCommits();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        hash: 'abc123',
        message: 'Initial commit'
      });
      expect(result[1]).toEqual({
        hash: 'def456',
        message: 'Add new feature'
      });
    });

    it('should respect custom count', () => {
      execSync.mockReturnValue('');

      getRecentCommits(5);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('-5'),
        expect.any(Object)
      );
    });

    it('should return empty array on error', () => {
      execSync.mockImplementation(() => {
        throw new Error('git error');
      });

      const result = getRecentCommits();
      expect(result).toEqual([]);
    });
  });

  describe('branchExists', () => {
    it('should return true when branch exists', () => {
      execSync.mockReturnValue('');

      const result = branchExists('feature/test');
      expect(result).toBe(true);
    });

    it('should return false when branch does not exist', () => {
      execSync.mockImplementation(() => {
        throw new Error('branch not found');
      });

      const result = branchExists('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('generateBranchName', () => {
    it('should generate branch name from message', () => {
      const result = generateBranchName('Add user authentication feature');
      expect(result).toMatch(/^feature\/add-user-authentication-feature-\d{4}-\d{2}-\d{2}$/);
    });

    it('should use custom prefix', () => {
      const result = generateBranchName('Critical bug in payment', 'fix/');
      expect(result).toMatch(/^fix\/critical-bug-in-payment-\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle special characters', () => {
      const result = generateBranchName('Fix: Issue #123 - User\'s data');
      expect(result).toMatch(/^feature\/fix-issue-123-users-data-\d{4}-\d{2}-\d{2}$/);
    });

    it('should truncate long names', () => {
      const longMessage = 'a'.repeat(100);
      const result = generateBranchName(longMessage);
      expect(result.length).toBeLessThanOrEqual(80);
    });
  });

  describe('execGitCommand', () => {
    it('should execute git command and return output', () => {
      execSync.mockReturnValue('command output\n');

      const result = execGitCommand('git status');
      expect(result).toBe('command output\n');
      expect(execSync).toHaveBeenCalledWith('git status', expect.any(Object));
    });

    it('should handle command errors', () => {
      execSync.mockImplementation(() => {
        const error = new Error('command failed');
        error.stderr = 'error details';
        throw error;
      });

      expect(() => execGitCommand('git invalid')).toThrow('Git command failed');
    });
  });

  describe('getChangedFiles', () => {
    it('should return list of changed files', () => {
      execSync.mockReturnValue('M  src/file1.js\nA  src/file2.js\nD  src/old.js\n');

      const result = getChangedFiles();
      expect(result).toEqual([
        { status: 'M', file: 'src/file1.js' },
        { status: 'A', file: 'src/file2.js' },
        { status: 'D', file: 'src/old.js' }
      ]);
    });

    it('should return empty array when no changes', () => {
      execSync.mockReturnValue('');

      const result = getChangedFiles();
      expect(result).toEqual([]);
    });
  });

  describe('isBranchBehind', () => {
    it('should detect when branch is behind', () => {
      // Mock sequence: getMainBranch, getCurrentBranch, fetch, rev-list
      execSync
        .mockReturnValueOnce('main\n') // getMainBranch
        .mockReturnValueOnce('feature/test\n') // getCurrentBranch
        .mockReturnValueOnce('') // fetch
        .mockReturnValueOnce('5\n'); // rev-list count

      const result = isBranchBehind();
      expect(result).toBe(true);
    });

    it('should detect when branch is up to date', () => {
      execSync
        .mockReturnValueOnce('main\n') // getMainBranch
        .mockReturnValueOnce('feature/test\n') // getCurrentBranch
        .mockReturnValueOnce('') // fetch
        .mockReturnValueOnce('0\n'); // rev-list count

      const result = isBranchBehind();
      expect(result).toBe(false);
    });
  });

  describe('hasRemoteBranch', () => {
    it('should return true when remote branch exists', () => {
      execSync.mockReturnValue('origin/feature/test\n');

      const result = hasRemoteBranch('feature/test');
      expect(result).toBe(true);
    });

    it('should return false when remote branch does not exist', () => {
      execSync.mockReturnValue('');

      const result = hasRemoteBranch('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle git command errors gracefully', () => {
      execSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      expect(() => isGitRepository()).not.toThrow();
      expect(() => getCurrentBranch()).not.toThrow();
      expect(() => getMainBranch()).not.toThrow();
    });
  });
});