import { jest } from "@jest/globals";
import { TeamActivityEnhancer } from "../../../src/enhancers/core/team-activity-enhancer.js";
import { EnhancedResponse } from "../../../src/core/enhanced-response.js";

// Mock git-helpers
jest.mock("../../../src/utils/git-helpers.js", () => ({
  getRecentCommits: jest.fn(),
  hasRemoteBranch: jest.fn(),
  execGitCommand: jest.fn(),
}));

// Mock child_process
jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

describe("TeamActivityEnhancer", () => {
  let enhancer;
  let mockContext;
  let gitHelpers;
  let childProcess;

  beforeEach(async () => {
    enhancer = new TeamActivityEnhancer();
    mockContext = {
      sessionId: "test-session",
      gitContext: {
        branch: "feature/test",
      },
    };

    // Get mocked modules
    gitHelpers = await import("../../../src/utils/git-helpers.js");
    childProcess = await import("child_process");
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should have correct properties", () => {
      expect(enhancer.name).toBe("TeamActivityEnhancer");
      expect(enhancer.metadata.description).toBe("Adds team collaboration context to responses");
      expect(enhancer.priority).toBe(20); // EnhancerPriority.LOW
      expect(enhancer.dependencies).toEqual(["MetadataEnhancer"]);
    });
  });

  describe("canEnhance", () => {
    it("should return true for valid responses", () => {
      const response = new EnhancedResponse({
        success: true,
        message: "Operation completed",
      });
      expect(enhancer.canEnhance(response)).toBe(true);
    });

    it("should return false when disabled", () => {
      enhancer.setEnabled(false);
      const response = new EnhancedResponse({ success: true });
      expect(enhancer.canEnhance(response)).toBe(false);
    });
  });

  describe("enhance", () => {
    describe("recent activity detection", () => {
      it("should add recent commits from team members", async () => {
        gitHelpers.getRecentCommits.mockResolvedValue([
          {
            hash: "abc123",
            author: "John Doe",
            email: "john@example.com",
            message: "Fix bug in auth",
            date: new Date().toISOString(),
          },
          {
            hash: "def456",
            author: "Jane Smith",
            email: "jane@example.com",
            message: "Add new feature",
            date: new Date(Date.now() - 3600000).toISOString(),
          },
        ]);

        const response = new EnhancedResponse({
          success: true,
          message: "Checking team activity",
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.getTeamActivity();
        expect(teamActivity).toBeDefined();
        expect(teamActivity.recentCommits).toHaveLength(2);
        expect(teamActivity.activeContributors).toContain("John Doe");
        expect(teamActivity.activeContributors).toContain("Jane Smith");
      });

      it("should identify related branches", async () => {
        childProcess.execSync.mockImplementation((cmd) => {
          if (cmd.includes("branch -r")) {
            return "origin/feature/auth\norigin/feature/auth-ui\norigin/feature/test\norigin/fix/auth-bug\n";
          }
          return "";
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Branch created",
          data: { branch: "feature/auth-api" },
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.getTeamActivity();
        expect(teamActivity.relatedBranches).toBeDefined();
        expect(teamActivity.relatedBranches).toContain("feature/auth");
        expect(teamActivity.relatedBranches).toContain("feature/auth-ui");
      });

      it("should find active pull requests", async () => {
        gitHelpers.execGitCommand.mockResolvedValue({
          success: true,
          output: JSON.stringify([
            {
              number: 123,
              title: "Add authentication",
              author: { login: "johndoe" },
              createdAt: new Date().toISOString(),
              state: "open",
            },
            {
              number: 124,
              title: "Fix auth bug",
              author: { login: "janesmith" },
              createdAt: new Date().toISOString(),
              state: "open",
            },
          ]),
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Checking PRs",
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.getTeamActivity();
        expect(teamActivity.activePRs).toHaveLength(2);
        expect(teamActivity.activePRs[0].number).toBe(123);
      });
    });

    describe("file contributor analysis", () => {
      it("should identify contributors for affected files", async () => {
        childProcess.execSync.mockImplementation((cmd) => {
          if (cmd.includes("shortlog")) {
            return "    10\tJohn Doe\n     5\tJane Smith\n";
          }
          return "";
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Files modified",
        });
        response.addMetadata("files", ["src/auth.js", "src/utils.js"]);

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.getTeamActivity();
        expect(teamActivity.fileContributors).toBeDefined();
        expect(teamActivity.fileContributors["src/auth.js"]).toBeDefined();
        expect(teamActivity.potentialReviewers).toContain("John Doe");
      });

      it("should suggest reviewers based on contribution count", async () => {
        childProcess.execSync
          .mockImplementationOnce((cmd) => {
            if (cmd.includes("shortlog")) {
              return "    20\tExpert Dev\n     2\tJunior Dev\n";
            }
            return "";
          })
          .mockImplementationOnce((cmd) => {
            if (cmd.includes("shortlog")) {
              return "    15\tExpert Dev\n     8\tMid Dev\n";
            }
            return "";
          });

        const response = new EnhancedResponse({
          success: true,
          message: "PR created",
        });
        response.addMetadata("files", ["src/core.js", "src/api.js"]);

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.getTeamActivity();
        expect(teamActivity.potentialReviewers[0]).toBe("Expert Dev");
        expect(teamActivity.potentialReviewers).toContain("Mid Dev");
      });
    });

    describe("conflict detection", () => {
      it("should detect potential conflicts with other branches", async () => {
        childProcess.execSync.mockImplementation((cmd) => {
          if (cmd.includes("branch -r")) {
            return "origin/feature/auth\norigin/feature/auth-refactor\n";
          }
          if (cmd.includes("merge-base")) {
            return "base123\n";
          }
          if (cmd.includes("diff --name-only")) {
            return "src/auth.js\nsrc/config.js\n";
          }
          return "";
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Checking conflicts",
        });
        response.addMetadata("files", ["src/auth.js", "src/user.js"]);

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.getTeamActivity();
        expect(teamActivity.potentialConflicts).toBeDefined();
        expect(teamActivity.potentialConflicts.length).toBeGreaterThan(0);
        expect(teamActivity.potentialConflicts[0].branch).toBe("feature/auth");
        expect(teamActivity.potentialConflicts[0].conflictingFiles).toContain("src/auth.js");
      });
    });

    describe("collaboration insights", () => {
      it("should provide collaboration suggestions", async () => {
        gitHelpers.getRecentCommits.mockResolvedValue([
          {
            hash: "abc123",
            author: "John Doe",
            message: "WIP: Auth implementation",
            date: new Date().toISOString(),
          },
        ]);

        childProcess.execSync.mockImplementation((cmd) => {
          if (cmd.includes("branch -r")) {
            return "origin/feature/auth-ui\norigin/feature/auth-api\n";
          }
          return "";
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Branch created",
          data: { branch: "feature/auth-backend" },
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.getTeamActivity();
        expect(teamActivity.insights).toBeDefined();
        expect(teamActivity.insights.length).toBeGreaterThan(0);
      });

      it("should detect team working on similar features", async () => {
        gitHelpers.getRecentCommits.mockResolvedValue([
          {
            hash: "abc123",
            author: "John Doe",
            message: "Add user authentication",
            date: new Date().toISOString(),
          },
          {
            hash: "def456",
            author: "Jane Smith",
            message: "Implement JWT tokens",
            date: new Date().toISOString(),
          },
        ]);

        const response = new EnhancedResponse({
          success: true,
          message: "Starting work",
          data: { branch: "feature/oauth" },
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.getTeamActivity();
        expect(teamActivity.relatedWork).toBeDefined();
        expect(teamActivity.relatedWork.length).toBeGreaterThan(0);
      });
    });

    describe("activity summary", () => {
      it("should generate activity summary", async () => {
        gitHelpers.getRecentCommits.mockResolvedValue([
          {
            hash: "abc123",
            author: "John Doe",
            message: "Fix bug",
            date: new Date().toISOString(),
          },
          {
            hash: "def456",
            author: "Jane Smith",
            message: "Add feature",
            date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          },
        ]);

        const response = new EnhancedResponse({
          success: true,
          message: "Analyzing activity",
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const teamActivity = enhanced.getTeamActivity();
        expect(teamActivity.summary).toBeDefined();
        expect(teamActivity.summary.totalCommits).toBe(2);
        expect(teamActivity.summary.uniqueContributors).toBe(2);
        expect(teamActivity.summary.mostActiveContributor).toBeDefined();
      });
    });

    describe("error handling", () => {
      it("should handle git command failures gracefully", async () => {
        gitHelpers.getRecentCommits.mockRejectedValue(new Error("Git error"));
        childProcess.execSync.mockImplementation(() => {
          throw new Error("Command failed");
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Operation completed",
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        expect(enhanced).toBeDefined();
        const teamActivity = enhanced.getTeamActivity();
        expect(teamActivity).toBeDefined();
        expect(teamActivity.error).toBeUndefined(); // Errors should be handled silently
      });

      it("should handle missing context", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Test operation",
        });

        const enhanced = await enhancer.enhance(response, null);

        expect(enhanced).toBeDefined();
        expect(enhanced.teamActivity).toBeDefined();
        expect(enhanced.teamActivity.limited).toBe(true);
      });
    });

    describe("configuration", () => {
      it("should respect activity window configuration", async () => {
        const configuredEnhancer = new TeamActivityEnhancer({
          activityWindow: 7, // 7 days
        });

        gitHelpers.getRecentCommits.mockResolvedValue([]);

        const response = new EnhancedResponse({ success: true });
        await configuredEnhancer.enhance(response, mockContext);

        expect(gitHelpers.getRecentCommits).toHaveBeenCalledWith(expect.any(Number));
      });

      it("should disable features based on configuration", async () => {
        const configuredEnhancer = new TeamActivityEnhancer({
          trackCommits: false,
          trackBranches: false,
        });

        const response = new EnhancedResponse({ success: true });
        const enhanced = await configuredEnhancer.enhance(response, mockContext);

        const teamActivity = enhanced.getTeamActivity();
        expect(teamActivity.recentCommits).toBeUndefined();
        expect(teamActivity.relatedBranches).toBeUndefined();
      });
    });

    describe("caching", () => {
      it("should cache team activity data", async () => {
        gitHelpers.getRecentCommits.mockResolvedValue([
          {
            hash: "abc123",
            author: "John Doe",
            message: "Test commit",
            date: new Date().toISOString(),
          },
        ]);

        const response = new EnhancedResponse({ success: true });

        // First call
        await enhancer.enhance(response, mockContext);
        expect(gitHelpers.getRecentCommits).toHaveBeenCalledTimes(1);

        // Second call within cache window should use cache
        await enhancer.enhance(response, mockContext);
        expect(gitHelpers.getRecentCommits).toHaveBeenCalledTimes(1);
      });

      it("should invalidate cache after timeout", async () => {
        const shortCacheEnhancer = new TeamActivityEnhancer({
          cacheTimeout: 100, // 100ms
        });

        gitHelpers.getRecentCommits.mockResolvedValue([]);

        const response = new EnhancedResponse({ success: true });

        await shortCacheEnhancer.enhance(response, mockContext);
        expect(gitHelpers.getRecentCommits).toHaveBeenCalledTimes(1);

        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 150));

        await shortCacheEnhancer.enhance(response, mockContext);
        expect(gitHelpers.getRecentCommits).toHaveBeenCalledTimes(2);
      });
    });
  });
});