import { jest } from "@jest/globals";

// Create mock before imports
const mockExecSync = jest.fn();
jest.unstable_mockModule("child_process", () => ({
  execSync: mockExecSync,
  default: { execSync: mockExecSync }
}));

// Import after mocking
const {
  isGitRepository,
  getCurrentBranch,
  getMainBranch,
  hasUncommittedChanges,
  getRecentCommits,
  getChangedFiles,
  branchExists,
  hasScript,
  generateBranchName,
  execGitCommand,
  getRemoteUrl,
  getMergedBranches,
  isBranchBehind,
  getBranchDivergence,
  safeRebase,
  isBranchMerged,
  hasRemoteBranch,
  forceRebaseOnMain,
  ensureMainUpdated,
} = await import("../../../src/utils/git-helpers.js");

describe("Git Helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isGitRepository", () => {
    it("should return true when in a git repository", () => {
      mockExecSync.mockReturnValue("");

      const result = isGitRepository();
      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith("git rev-parse --git-dir", { stdio: "pipe" });
    });

    it("should return false when not in a git repository", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("not a git repository");
      });

      const result = isGitRepository();
      expect(result).toBe(false);
    });
  });

  describe("getCurrentBranch", () => {
    it("should return the current branch name using --show-current", () => {
      mockExecSync.mockReturnValue("feature/test\n");

      const result = getCurrentBranch();
      expect(result).toBe("feature/test");
      expect(mockExecSync).toHaveBeenCalledWith("git branch --show-current", {
        encoding: "utf8",
      });
    });

    it("should fallback to rev-parse if --show-current fails", () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error("unrecognized option");
        })
        .mockReturnValueOnce("main\n");

      const result = getCurrentBranch();
      expect(result).toBe("main");
      expect(mockExecSync).toHaveBeenCalledWith("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      });
    });

    it("should parse branch from git status as last resort", () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error("error");
        })
        .mockImplementationOnce(() => {
          throw new Error("error");
        })
        .mockReturnValueOnce("On branch develop\nnothing to commit");

      const result = getCurrentBranch();
      expect(result).toBe("develop");
    });

    it("should return empty string if all methods fail", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("error");
      });

      const result = getCurrentBranch();
      expect(result).toBe("");
    });
  });

  describe("getMainBranch", () => {
    it("should get default branch from remote", () => {
      mockExecSync.mockReturnValue("refs/remotes/origin/main\n");

      const result = getMainBranch();
      expect(result).toBe("main");
    });

    it("should check for main branch locally if remote fails", () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error("no remote");
        })
        .mockReturnValueOnce(""); // main exists

      const result = getMainBranch();
      expect(result).toBe("main");
    });

    it("should check for master branch if main doesn't exist", () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error("no remote");
        })
        .mockImplementationOnce(() => {
          throw new Error("main not found");
        })
        .mockReturnValueOnce(""); // master exists

      const result = getMainBranch();
      expect(result).toBe("master");
    });

    it("should default to main if nothing exists", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("not found");
      });

      const result = getMainBranch();
      expect(result).toBe("main");
    });
  });

  describe("hasUncommittedChanges", () => {
    it("should return true when there are uncommitted changes", () => {
      mockExecSync.mockReturnValue("M  src/file.js\n?? new-file.txt\n");

      const result = hasUncommittedChanges();
      expect(result).toBe(true);
    });

    it("should return false when working directory is clean", () => {
      mockExecSync.mockReturnValue("");

      const result = hasUncommittedChanges();
      expect(result).toBe(false);
    });

    it("should return false on error", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("git error");
      });

      const result = hasUncommittedChanges();
      expect(result).toBe(false);
    });
  });

  describe("getRecentCommits", () => {
    it("should return parsed recent commits", () => {
      const mockLog = 
        "abc123 Fix bug in auth module\n" +
        "def456 Add new feature";

      mockExecSync.mockReturnValue(mockLog);

      const result = getRecentCommits();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        hash: "abc123",
        message: "Fix bug in auth module",
      });
      expect(result[1]).toEqual({
        hash: "def456",
        message: "Add new feature",
      });
    });

    it("should respect custom count", () => {
      mockExecSync.mockReturnValue("");

      getRecentCommits(5);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("-5"),
        expect.any(Object)
      );
    });

    it("should return empty array on error", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("git error");
      });

      const result = getRecentCommits();
      expect(result).toEqual([]);
    });
  });

  describe("branchExists", () => {
    it("should return true when branch exists", () => {
      mockExecSync.mockReturnValue("");

      const result = branchExists("feature/test");
      expect(result).toBe(true);
    });

    it("should return false when branch does not exist", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("branch not found");
      });

      const result = branchExists("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("generateBranchName", () => {
    it("should generate branch name from message", () => {
      const result = generateBranchName("Add user authentication feature");
      expect(result).toMatch(/^feature\/add-user-authentication-feature-\d{4}-\d{2}-\d{2}$/);
    });

    it("should use custom prefix", () => {
      const result = generateBranchName("Critical bug in payment", "fix/");
      expect(result).toMatch(/^fix\/critical-bug-in-payment-\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle special characters", () => {
      const result = generateBranchName("Fix: Issue #123 - User's data");
      expect(result).toMatch(/^feature\/fix-issue-123-.*-\d{4}-\d{2}-\d{2}$/);
    });

    it("should truncate long names", () => {
      const longMessage = "This is a very long message that should be truncated to create a reasonable branch name";
      const result = generateBranchName(longMessage);
      expect(result.length).toBeLessThanOrEqual(80); // reasonable length with prefix
    });
  });

  describe("execGitCommand", () => {
    it("should execute git command and return output", () => {
      mockExecSync.mockReturnValue("command output\n");

      const result = execGitCommand("git status");
      expect(result).toBe("command output\n");
      expect(mockExecSync).toHaveBeenCalledWith("git status", expect.any(Object));
    });

    it("should handle command errors", () => {
      mockExecSync.mockImplementation(() => {
        const error = new Error("command failed");
        error.stderr = "error details";
        throw error;
      });

      expect(() => execGitCommand("invalid-command")).toThrow("command failed");
    });
  });

  describe("getChangedFiles", () => {
    it("should return list of changed files", () => {
      mockExecSync.mockReturnValue("M  src/file1.js\nA  src/file2.js\nD  src/old.js\n");

      const result = getChangedFiles();
      expect(result).toEqual([
        { status: "M", file: "src/file1.js" },
        { status: "A", file: "src/file2.js" },
        { status: "D", file: "src/old.js" },
      ]);
    });

    it("should return empty array when no changes", () => {
      mockExecSync.mockReturnValue("");

      const result = getChangedFiles();
      expect(result).toEqual([]);
    });
  });

  describe("isBranchBehind", () => {
    it("should detect when branch is behind", () => {
      mockExecSync
        .mockReturnValueOnce("refs/remotes/origin/main\n") // getMainBranch - git symbolic-ref
        .mockReturnValueOnce("feature/test\n") // getCurrentBranch
        .mockReturnValueOnce("") // git fetch (no output)
        .mockReturnValueOnce("5\n"); // rev-list count

      const result = isBranchBehind();
      expect(result).toBe(true);
    });

    it("should detect when branch is up to date", () => {
      mockExecSync
        .mockReturnValueOnce("refs/remotes/origin/main\n") // getMainBranch - git symbolic-ref
        .mockReturnValueOnce("feature/test\n") // getCurrentBranch
        .mockReturnValueOnce("") // git fetch (no output)
        .mockReturnValueOnce("0\n"); // rev-list count

      const result = isBranchBehind();
      expect(result).toBe(false);
    });
  });

  describe("hasRemoteBranch", () => {
    it("should return true when remote branch exists", () => {
      mockExecSync.mockReturnValue("origin/feature/test\n");

      const result = hasRemoteBranch("feature/test");
      expect(result).toBe(true);
    });

    it("should return false when remote branch does not exist", () => {
      mockExecSync.mockReturnValue("");

      const result = hasRemoteBranch("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should handle git command errors gracefully", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("fatal: not a git repository");
      });

      expect(isGitRepository()).toBe(false);
      expect(hasUncommittedChanges()).toBe(false);
      expect(getRecentCommits()).toEqual([]);
    });
  });
});