# Actual Budget MCP Server 💰

[![CI](https://github.com/guitarbeat/actual-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/guitarbeat/actual-mcp/actions/workflows/ci.yml)
[![code style: airbnb](https://img.shields.io/badge/code%20style-airbnb-blue.svg)](https://github.com/airbnb/javascript)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

This repository contains the Actual Budget MCP server, designed to bridge the gap between your local [Actual Budget](https://actualbudget.com/) data and modern AI tools.

The repository is organized as a `pnpm` workspace so you can install dependencies once at the root and run package-specific commands with shared scripts.

## 🚀 Project

### 🤖 [Actual MCP Server](./mcp-server)
A Model Context Protocol (MCP) server that exposes your Actual Budget data to LLMs (Claude Desktop, ChatGPT, Poke, etc.).
- **Features**: Live account balance checks, transaction history, spending analysis, and automated financial insights.
- **Deployment**: One-click deployment to **Render**.

---

## ☕ Support the Project

If you find these tools helpful and want to support their ongoing development, feel free to buy me a coffee!

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_badges/orange_card.png)](https://www.buymeacoffee.com/your-username-here)

---

## 🛠️ Setup

The repository is managed from the workspace root.

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 10

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/guitarbeat/actual-mcp.git
   cd actual-mcp
   ```

2. **Install workspace dependencies once:**
   ```bash
   pnpm install
   ```

3. **Run package-specific commands from the root:**
   ```bash
   pnpm --filter actual-mcp build
   pnpm --filter actual-mcp test
   ```

### Workspace Commands

```bash
pnpm build                # Run the MCP server build
pnpm test                 # Run the MCP server test suite
pnpm quality              # Run lint, format checks, and type-checks where available
pnpm dev:mcp-server       # Start the MCP server in development mode
```

### Repository Layout

```text
.
├── mcp-server/           # Actual Budget MCP server
├── features/             # Feature notes and planning artifacts
├── verification/         # Manual verification helpers
└── render.yaml           # Render blueprint for the MCP server
```

## 📈 Deployment

The `mcp-server` is configured for deployment on Render. See [render.yaml](./render.yaml) for the service definition.
