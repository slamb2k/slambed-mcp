# glam-mcp

[![PR Checks](https://github.com/slamb2k/glam-mcp/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/slamb2k/glam-mcp/actions/workflows/pr-checks.yml)
[![Release](https://github.com/slamb2k/glam-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/slamb2k/glam-mcp/actions/workflows/release.yml)
[![npm version](https://badge.fury.io/js/glam-mcp.svg)](https://www.npmjs.com/package/glam-mcp)

A pure MCP (Model Context Protocol) server that provides intelligent development experiences through rich, contextual responses for AI assistants. glam-mcp transforms AI-assisted development into a "pair programming with a senior developer" experience.

## Overview

glam-mcp is a Model Context Protocol server designed to enhance AI assistant capabilities with deep development context, team awareness, and intelligent workflow orchestration. By providing rich metadata, contextual suggestions, and safety analysis with every operation, glam-mcp enables AI assistants to deliver more intelligent and helpful development experiences.

## Key Features

### 🎯 Pure MCP Architecture
- Clean MCP server implementation without CLI dependencies
- Rich, contextual responses that guide AI assistants
- Stateful session tracking for intelligent suggestions

### 🧠 Enhanced Response System
Every tool response includes:
- **Core Results**: Operation success/failure and data
- **Context Object**: Suggestions, risks, related tools, team activity, best practices
- **Metadata**: Operation type, timestamp, affected files, session context

### 👥 Team Awareness
- Detect when team members are working on related code
- Suggest appropriate reviewers based on file ownership
- Warn about potential conflicts before they occur
- Track recent team activity on branches and files

### 🛡️ Built-in Safety
- Risk assessment for every operation
- Conflict detection and prevention
- Precondition validation
- Recovery suggestions for errors

### 🔧 Comprehensive Toolset
- **GitHub Flow Tools**: Branch creation, PR management, issue tracking
- **Automation Tools**: Smart commits, PR creation, release workflows
- **Context Tools**: Session tracking, preference management, operation history
- **Team Tools**: Activity monitoring, reviewer suggestions, conflict detection
- **Safety Tools**: Risk analysis, conflict checking, precondition validation

## Installation

```bash
npm install glam-mcp
```

## Configuration

Add to your Claude Desktop configuration (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "glam": {
      "command": "node",
      "args": ["/path/to/glam-mcp/src/index.js"]
    }
  }
}
```

For other MCP clients, refer to their specific configuration documentation.

## Usage

Once configured, glam-mcp tools are available to your AI assistant. The AI will intelligently orchestrate these tools based on your natural language requests.

### Example Workflows

**Starting a new feature:**
```
"I need to create a new feature for user authentication"
```
The AI assistant will use glam-mcp to:
- Check for existing related work
- Create an appropriate branch
- Set up the initial structure
- Suggest next steps

**Creating a pull request:**
```
"Let's create a PR for this feature"
```
Glam provides:
- Automatic commit grouping
- PR description generation
- Reviewer suggestions based on touched files
- Conflict warnings

**Checking team activity before starting work:**
```
"Who's working on the API endpoints right now?"
```
Glam-mcp helps by:
- Scanning recent commits and active branches
- Identifying team members working on related files
- Suggesting coordination strategies
- Warning about potential conflicts

**Smart commit workflow:**
```
"Commit these changes with a good message"
```
The assistant will:
- Analyze the changes to determine commit type
- Generate conventional commit messages
- Group related changes appropriately
- Suggest splitting large commits if needed

**Release preparation:**
```
"Is this branch ready to merge to main?"
```
Glam-mcp performs:
- Conflict detection with main branch
- CI/CD status verification
- Test coverage analysis
- Risk assessment for the merge

**Debugging a failed PR:**
```
"Why are the PR checks failing?"
```
The assistant leverages glam-mcp to:
- Fetch detailed CI/CD logs
- Identify the root cause
- Suggest fixes based on error patterns
- Check if similar issues affected other PRs

**Code review assistance:**
```
"Help me review this PR"
```
Glam provides:
- Automated checklist generation
- High-risk change identification
- Test coverage verification
- Suggestions for additional reviewers

**Syncing with upstream changes:**
```
"Update my branch with the latest from main"
```
The assistant will:
- Check for conflicts before syncing
- Preserve local changes safely
- Resolve simple conflicts automatically
- Guide through complex conflict resolution

**Finding related work:**
```
"Is anyone else working on the user service?"
```
Glam-mcp searches for:
- Active branches touching similar files
- Recent PRs in the same area
- Team members with expertise in that code
- Relevant documentation or issues

**Setting up development environment:**
```
"Set up my workspace for this project"
```
The assistant uses glam-mcp to:
- Clone the repository with proper configuration
- Set up git hooks and aliases
- Configure team preferences
- Initialize session context

### Advanced Workflows

**Multi-branch development:**
```
"I need to work on both the frontend and backend changes simultaneously"
```
Glam-mcp orchestrates:
- Creates separate branches for frontend and backend
- Tracks dependencies between changes
- Suggests integration points
- Manages cross-branch conflicts
- Coordinates PR sequencing

**Hotfix deployment:**
```
"We need to deploy a critical fix to production immediately"
```
The assistant coordinates:
- Creates hotfix branch from production tag
- Bypasses normal review process safely
- Ensures fix is cherry-picked to main
- Updates all active feature branches
- Documents the emergency change

**Large refactoring project:**
```
"Help me refactor the entire authentication module"
```
Glam-mcp provides:
- Breaking down refactoring into safe stages
- Creating incremental commits
- Maintaining backwards compatibility
- Coordinating with affected teams
- Tracking progress through checklists

**Dependency update workflow:**
```
"Update all our dependencies safely"
```
The assistant will:
- Check for breaking changes in updates
- Create isolated test branches
- Run comprehensive test suites
- Generate detailed update reports
- Suggest phased rollout strategies

**Cross-team collaboration:**
```
"Coordinate with the mobile team on the new API"
```
Glam-mcp facilitates:
- Creating shared branches
- Setting up integration tests
- Tracking API contract changes
- Coordinating release timing
- Managing documentation updates

## Tool Categories

### GitHub Flow Tools
- `github_flow_start`: Start feature development with branch creation
- `github_flow_pr`: Create PRs with intelligent defaults
- `github_check_pr_status`: Monitor PR checks and reviews

### Automation Tools
- `auto_commit`: Smart commit with conventional messages
- `auto_pr`: Automated PR creation with context
- `pr_review_checklist`: Generate review checklists

### Context Tools
- `get_session_context`: Retrieve current session state
- `set_user_preference`: Store user preferences
- `get_recent_operations`: View operation history

### Team Tools
- `check_team_activity`: Monitor team work on related code
- `find_related_work`: Discover relevant branches/PRs
- `suggest_reviewers`: Get reviewer recommendations

### Safety Tools
- `analyze_operation_risk`: Assess operation risks
- `check_for_conflicts`: Detect potential conflicts
- `validate_preconditions`: Ensure safe operations

## Architecture

```
src/
├── index.js              # MCP server entry point
├── tools/                # Tool implementations
│   ├── github-flow.js    # GitHub workflow tools
│   ├── automation.js     # Automation tools
│   ├── context.js        # Context management tools
│   ├── team.js          # Team collaboration tools
│   └── safety.js        # Safety and validation tools
├── enhancers/           # Response enrichment
│   ├── metadata.js      # Operation metadata
│   ├── suggestions.js   # Next step suggestions
│   ├── risk.js          # Risk assessment
│   └── team.js          # Team activity
├── context/             # Session management
│   └── session.js       # Session state tracking
└── utils/               # Utilities
    ├── git-helpers.js   # Git operations
    └── responses.js     # Response formatting
```

## Response Structure

Every tool returns a rich response:

```javascript
{
  success: true,
  data: { /* operation-specific data */ },
  context: {
    suggestions: ["next steps..."],
    risks: ["potential issues..."],
    relatedTools: ["tool_name"],
    teamActivity: { /* current team work */ },
    bestPractices: ["recommendations..."]
  },
  metadata: {
    operation: "tool_name",
    timestamp: "2024-01-09T10:00:00Z",
    affectedFiles: ["file1.js", "file2.js"],
    sessionContext: { /* session state */ }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start in development mode
npm run dev
```

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment. The pipeline ensures code quality and stability through automated testing and checks.

### Pull Request Checks

Every pull request triggers the following checks:

- **Multiple Node.js Versions**: Tests run on Node.js 18.x and 20.x
- **Test Suite**: Full test suite with coverage reporting
- **Code Linting**: ESLint checks for code quality
- **Format Checking**: Prettier validation for consistent formatting
- **Security Audit**: npm audit for dependency vulnerabilities
- **Build Verification**: Ensures the project builds successfully
- **Auto-labeling**: PRs are automatically labeled based on changed files

### Branch Protection

The `main` branch is protected with the following requirements:

- All CI checks must pass
- Branches must be up to date before merging
- Conversation resolution required before merging

### Running CI Locally

You can run the same checks locally before pushing:

```bash
# Run all tests with coverage
npm test -- --coverage

# Check linting
npm run lint

# Check formatting
npm run format:check

# Run security audit
npm audit
```

## Release Process

This project uses automated releases through GitHub Actions. To create a new release:

1. **Update Version**: Update the version in `package.json` according to [Semantic Versioning](https://semver.org/)
2. **Update Changelog**: Add your changes to `CHANGELOG.md` under the "Unreleased" section
3. **Commit Changes**: Commit with message like `chore: prepare release v1.2.3`
4. **Create Tag**: `git tag v1.2.3 && git push origin v1.2.3`

The automated workflow will:
- Validate the version format
- Run tests on Node.js 18.x and 20.x
- Generate release notes from commit history
- Publish to npm registry
- Create a GitHub release with artifacts
- Open a PR for the next version bump

### Manual Release

You can also trigger a release manually:
1. Go to Actions → Release → Run workflow
2. Enter the version number (e.g., `1.2.3`)
3. Check "pre-release" if applicable

### Pre-releases

For pre-releases, use version numbers like `1.2.3-beta.1` or `1.2.3-rc.1`. These will be published to npm with the `beta` tag.

## Contributing

Contributions are welcome! Please ensure all CI checks pass before submitting your PR. The automated checks will provide feedback on any issues that need to be addressed.

## License

MIT License - see LICENSE file for details

## Support

- Issues: [GitHub Issues](https://github.com/slambrouskii/glam-mcp/issues)
- Documentation: [Full Documentation](https://github.com/slambrouskii/glam-mcp/wiki)

---

Built with ❤️ to make AI-assisted development more intelligent and collaborative.