# Actual Budget MCP & Utilities 💰

This repository contains a suite of tools designed to enhance your [Actual Budget](https://actualbudget.com/) experience, specifically bridging the gap between your local budget and modern AI tools.

## 🚀 Projects

### 🤖 [Actual MCP Server](./mcp-server)
A Model Context Protocol (MCP) server that exposes your Actual Budget data to LLMs (Claude Desktop, ChatGPT, Poke, etc.).
- **Features**: Live account balance checks, transaction history, spending analysis, and automated financial insights.
- **Deployment**: One-click deployment to **Render**.

### 📄 [Statement Processor](./statement-processor)
Utilities for processing and normalizing financial statements for import into Actual.

---

## ☕ Support the Project

If you find these tools helpful and want to support their ongoing development, feel free to buy me a coffee!

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_badges/orange_card.png)](https://www.buymeacoffee.com/your-username-here)

---

## 🛠️ Setup

Each project in this repository is managed independently. Please refer to the `README.md` in each subdirectory for specific setup instructions.

### Prerequisites

- Node.js >= 20.0.0
- npm (latest stable)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/guitarbeat/actual-mcp.git
   cd actual-mcp
   ```

2. **Install dependencies for MCP Server:**
   ```bash
   cd mcp-server
   npm install
   ```

3. **Install dependencies for Statement Processor:**
   ```bash
   cd ../statement-processor
   npm install
   ```

## 📈 Deployment

The `mcp-server` is configured for deployment on Render. See [render.yaml](./render.yaml) for service definitions.
