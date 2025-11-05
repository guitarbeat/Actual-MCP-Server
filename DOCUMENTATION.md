# Documentation Structure

This document describes the consolidated documentation structure for the Actual Budget MCP Server.

## Root Level Documentation

### README.md
**Purpose**: Main project documentation  
**Contents**:
- Project overview and features
- Installation and setup instructions
- Tool reference with examples
- Usage with Claude Desktop
- Environment variables
- Troubleshooting

### ARCHITECTURE.md
**Purpose**: Technical architecture documentation  
**Contents**:
- Design principles and patterns
- API connection architecture
- Core modules (response, input, formatting, data, cache, performance)
- Tool architecture and consolidation pattern
- Type system
- Error handling
- Performance optimization
- Testing strategy

### CONTRIBUTING.md
**Purpose**: Contribution guidelines  
**Contents**:
- Development setup
- Coding standards
- Project structure
- Adding new tools
- Testing guidelines
- Code quality standards (duplication, complexity)
- Project status and API coverage
- Pull request process
- Common patterns

### AGENTS.md
**Purpose**: AI agent rules and guidelines  
**Contents**:
- Project awareness and context
- Code structure and modularity rules
- Testing and reliability requirements
- Style and conventions
- Documentation requirements
- AI behavior rules

## docs/ Directory

### docs/MIGRATION-GUIDE.md
**Purpose**: Tool consolidation migration guide  
**Contents**:
- Breaking changes (v2.0.0)
- Removed tools (15 total)
- Migration examples for all entity types
- Quick reference tables
- Troubleshooting
- Implementation summary
- Performance metrics

### docs/PATTERNS.md
**Purpose**: Common code patterns and best practices  
**Contents**:
- Tool implementation patterns
- Response building patterns
- Input validation patterns
- Data fetching patterns
- Error handling patterns
- Testing patterns
- Real-world examples

### docs/PERFORMANCE.md
**Purpose**: Performance optimization guide  
**Contents**:
- Persistent API connection architecture
- Caching strategy and configuration
- Parallel data fetching
- Performance metrics and monitoring
- Optimization techniques
- Benchmarking

## Documentation Consolidation

### Removed Files
The following files were removed and their content consolidated:

1. **MIGRATION.md** (root) → Consolidated into docs/MIGRATION-GUIDE.md
2. **docs/MIGRATION.md** → Consolidated into docs/MIGRATION-GUIDE.md
3. **docs/README.md** → Was just an index, removed
4. **docs/CODE_QUALITY.md** → Merged into CONTRIBUTING.md
5. **docs/DEVELOPMENT.md** → Merged into CONTRIBUTING.md
6. **docs/SETUP.md** → Content in main README.md
7. **docs/DEPRECATION-COMPLETE.md** → Merged into MIGRATION-GUIDE.md
8. **docs/TOOL-CONSOLIDATION-SUMMARY.md** → Merged into MIGRATION-GUIDE.md
9. **DEPRECATION-COMPLETION-SUMMARY.md** → Merged into MIGRATION-GUIDE.md

### Benefits of Consolidation

- ✅ Reduced from 13 documentation files to 7
- ✅ Eliminated duplicate information
- ✅ Clearer organization and navigation
- ✅ Easier to maintain and update
- ✅ Better user experience

## Quick Navigation

**For Users:**
- Getting started → README.md
- Tool reference → README.md
- Migration from old tools → docs/MIGRATION-GUIDE.md

**For Developers:**
- Contributing → CONTRIBUTING.md
- Architecture → ARCHITECTURE.md
- Code patterns → docs/PATTERNS.md
- Performance → docs/PERFORMANCE.md

**For AI Agents:**
- Development rules → AGENTS.md
- Code patterns → docs/PATTERNS.md
- Architecture → ARCHITECTURE.md

## Maintenance

When updating documentation:

1. **User-facing changes** → Update README.md
2. **Architecture changes** → Update ARCHITECTURE.md
3. **Contribution process** → Update CONTRIBUTING.md
4. **New patterns** → Update docs/PATTERNS.md
5. **Performance features** → Update docs/PERFORMANCE.md
6. **Tool consolidation** → Update docs/MIGRATION-GUIDE.md

---

**Last Updated**: November 2024  
**Documentation Files**: 7 (down from 13)  
**Status**: Consolidated ✅
