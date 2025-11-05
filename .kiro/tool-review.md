# Optional Tools Review for AI Agent Use Case

## Current Status
- 16 core tools (always enabled)
- 16 optional tools (disabled by default, require env vars)

## Question: Should optional tools be enabled by default for AI agents?

---

## 🔧 Budget Management Tools (8 tools)

### 1. `get-budgets`
**What it does:** Lists all available budget files on the server  
**AI Agent Use Case:** ❓ **QUESTIONABLE**
- Only useful if user has multiple budgets
- You mentioned single-budget use case
- **Recommendation:** Keep optional (rarely needed)

### 2. `get-budget-months` 
**What it does:** Lists all months that have budget data  
**AI Agent Use Case:** ✅ **USEFUL**
- Helps agent understand available time range
- Useful for "show me my budget for last 6 months" queries
- **Recommendation:** Enable by default

### 3. `get-budget-month`
**What it does:** Gets detailed budget data for a specific month  
**AI Agent Use Case:** ✅ **VERY USEFUL**
- Core budgeting feature - see budgeted vs actual
- Essential for budget analysis conversations
- **Recommendation:** Enable by default (should be core!)

### 4. `load-budget` / `download-budget`
**What it does:** Switch between different budget files  
**AI Agent Use Case:** ❌ **NOT USEFUL**
- Only for multi-budget scenarios
- Auto-loads on startup already
- **Recommendation:** Keep optional or remove

### 5. `sync`
**What it does:** Manually trigger sync with server  
**AI Agent Use Case:** ⚠️ **EDGE CASE**
- Auto-sync already configured
- Might be useful for "sync now" commands
- **Recommendation:** Keep optional (auto-sync handles most cases)

### 6. `hold-budget-for-next-month`
**What it does:** Hold budget amount for next month  
**AI Agent Use Case:** ✅ **USEFUL**
- Advanced budgeting feature users might ask for
- "Save $500 for next month"
- **Recommendation:** Enable by default

### 7. `reset-budget-hold`
**What it does:** Cancel budget hold  
**AI Agent Use Case:** ✅ **USEFUL**
- Pairs with hold-budget
- **Recommendation:** Enable by default

---

## ⚙️ Advanced Account Operations (4 tools)

### 8. `create-account`
**What it does:** Create new accounts  
**AI Agent Use Case:** ✅ **USEFUL**
- "Add my new credit card"
- "Create a savings account"
- **Recommendation:** Enable by default

### 9. `close-account`
**What it does:** Close an account (mark as closed)  
**AI Agent Use Case:** ✅ **USEFUL**
- "I closed my old credit card"
- Natural lifecycle management
- **Recommendation:** Enable by default

### 10. `reopen-account`
**What it does:** Reopen a closed account  
**AI Agent Use Case:** ⚠️ **EDGE CASE**
- Rare scenario
- **Recommendation:** Keep optional

### 11. `delete-account`
**What it does:** Permanently delete account and all transactions  
**AI Agent Use Case:** ⚠️ **DANGEROUS**
- Destructive operation
- Should require explicit user intent
- **Recommendation:** Keep optional (safety)

---

## 🛠️ Utility Tools (4 tools)

### 12. `get-payee-rules`
**What it does:** Get rules associated with a specific payee  
**AI Agent Use Case:** ✅ **USEFUL**
- "What rules do I have for Amazon?"
- Helps understand automation
- **Recommendation:** Enable by default

### 13. `get-id-by-name`
**What it does:** Look up entity IDs by name  
**AI Agent Use Case:** ❌ **NOT NEEDED**
- Name resolution is built-in now
- Redundant with name-resolver utility
- **Recommendation:** Remove entirely

### 14. `run-query`
**What it does:** Execute raw ActualQL queries  
**AI Agent Use Case:** ⚠️ **POWER USER**
- Very advanced, requires SQL knowledge
- Could be dangerous if misused
- **Recommendation:** Keep optional (advanced users only)

### 15. `get-server-version`
**What it does:** Get Actual Budget server version  
**AI Agent Use Case:** ❌ **NOT USEFUL**
- Debugging/troubleshooting only
- Not conversational
- **Recommendation:** Keep optional or remove

---

## 📊 Summary & Recommendations

### Enable by Default (Move to Core) - 7 tools
1. ✅ `get-budget-months` - Essential for time-based queries
2. ✅ `get-budget-month` - Core budgeting feature
3. ✅ `hold-budget-for-next-month` - Useful budgeting feature
4. ✅ `reset-budget-hold` - Pairs with hold
5. ✅ `create-account` - Natural account management
6. ✅ `close-account` - Natural account lifecycle
7. ✅ `get-payee-rules` - Understand automation

### Keep Optional (Safety/Advanced) - 5 tools
1. ⚠️ `reopen-account` - Rare use case
2. ⚠️ `delete-account` - Destructive, needs caution
3. ⚠️ `sync` - Auto-sync handles most cases
4. ⚠️ `run-query` - Power users only
5. ⚠️ `get-budgets` - Multi-budget scenarios

### Consider Removing - 3 tools
1. ❌ `load-budget` - Auto-loads, multi-budget only
2. ❌ `download-budget` - Same as load-budget
3. ❌ `get-id-by-name` - Redundant with name-resolver
4. ❌ `get-server-version` - Not conversational

---

## Proposed New Structure

**Core Tools: 23 tools** (up from 16)
- Current 16 core tools
- Add 7 commonly useful tools

**Optional Tools: 5 tools** (down from 16)
- Safety-critical: delete-account
- Advanced: run-query, reopen-account
- Multi-budget: get-budgets, sync

**Remove: 4 tools**
- load-budget, download-budget, get-id-by-name, get-server-version

**Result:**
- 23 core tools (always available)
- 5 optional tools (require env vars)
- 4 tools removed
- **Total: 28 tools** (down from 32)

---

## Impact on Context Window

**Current:**
- 16 core tools × 150 tokens = 2,400 tokens
- 16 optional tools (disabled) = 0 tokens
- **Total: 2,400 tokens**

**Proposed:**
- 23 core tools × 150 tokens = 3,450 tokens
- 5 optional tools (disabled) = 0 tokens
- **Total: 3,450 tokens** (+1,050 tokens, still 43% reduction from original 37 tools)

**Trade-off:** +1,050 tokens for significantly better AI agent capabilities

---

## Questions for You

1. Do you ever use multiple budgets? (affects get-budgets, load-budget, download-budget)
2. Do you want the AI to be able to create/close accounts freely?
3. Is `run-query` (raw SQL) too dangerous to enable by default?
4. Should we keep `get-server-version` or remove it?
