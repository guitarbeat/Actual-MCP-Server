# Evaluation Suite

10 complex evaluation questions that test real-world multi-tool workflows against the Actual Budget MCP Server. Designed per the [MCP Builder Phase 4](https://github.com/anthropics/skills) guidelines.

## Usage

Use these questions to verify that an AI agent can correctly chain multiple MCP tools to answer real-world personal finance queries. Each question requires 2–5 tool calls and tests different aspects of the tool surface.

## Scoring

- **Pass**: Agent calls the correct tools in a valid order and arrives at the right answer.
- **Partial**: Agent calls the right tools but misinterprets results or skips a step.
- **Fail**: Agent uses wrong tools, hallucinates data, or cannot complete the task.
