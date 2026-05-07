# 💰 Budget & MCP Server Improvement Plan

*Based on live data pulled May 6, 2026*

---

## 🚨 The Big Picture

| Metric | Value | Status |
|--------|-------|--------|
| Carry-forward deficit | **-$26,349** | 🔴 Critical |
| May 2025 budgeted | **$0** | 🔴 Nothing allocated |
| Accounts with negative balance | **8 of 10** | 🔴 |
| Emergency Fund | **$0.20** | 🔴 Essentially empty |
| Monthly income | ~**$2,700** (May so far) | — |
| Monthly spending | ~**$4,265** (May so far) | 🟡 Outpacing income |

### Account Health Snapshot

| Account | Balance | Status |
|---------|---------|--------|
| 🏦 Chase Checking | -$7,934.96 | 🔴 Negative |
| 💰 Chase Savings | -$16,373.38 | 🔴 Deep negative |
| 💳 Amazon Prime | -$658.67 | 🔴 Negative |
| 💳 Bilt Rewards | -$219.03 | 🔴 Negative |
| 💳 Southwest Rewards | -$115.56 | 🔴 Negative |
| 💰 Apple Savings | -$18,840.68 | 🔴 Deep negative |
| 💵 Apple Cash | -$5,114.42 | 🔴 Negative |
| 💵 Venmo | -$12.11 | 🔴 Negative |
| 📈 Coinbase DOGE | $55.68 | 🟡 Low |
| 📈 Schwab Brokerage | $0.00 | 🟡 Empty |
| 💰 CIT HYSA | $23,742.94 | 🟢 Off-budget |
| 🏦 Cash App | $265.00 | 🟢 |
| 🏦 Robinhood Checking | $1,909.90 | 🟢 |
| 🏦 Schwab Checking | $3,042.10 | 🟢 |
| 🏦 Wells Fargo Checking | $1,799.20 | 🟢 |
| 💳 Apple Card | $5,063.63 | 🟢 |
| 💳 Bank of America Rewards | $2,639.05 | 🟢 |
| 💳 Robinhood Card | $8,358.61 | 🟢 |

> **Note:** Negative balances on credit cards may just mean you owe money (normal), but negative balances on checking/savings accounts in Actual usually mean transactions are recorded but not reconciled or transfers aren't properly linked.

---

## 🏗️ Budget Improvements (Priority Order)

### 1. 🚨 Fix the -$26K Deficit FIRST

The -$26,349 "to budget" number means your budget is deeply in the red from accumulated overspending across prior months. This poisons every new month because the deficit carries forward.

**Action Plan:**
- **Option A: Fresh Start** — Go to the earliest month with overspending and cover it by reducing category balances or using "Set Available" to zero out negative balances. Accept the loss and start clean.
- **Option B: Gradual Paydown** — Budget extra each month to chip away at the deficit. At $500/month extra, this takes ~4 years. Not realistic.
- **Recommendation: Option A.** Use Actual's "cover overspending" workflow to reset to zero and commit to a clean budget going forward.

### 2. 📋 Budget May 2025 Immediately

You have **$0 budgeted** across all categories for May while already spending $4,265+. Your MCP server has a `recommend-budget-plan` tool that suggested these amounts based on your 6-month spending history:

| Category | Recommended/mo | Method |
|----------|---------------|--------|
| 🏠 Rent | $1,283 | Fixed |
| 👥 Peer Transfers | $1,180 | Average |
| 📈 Investments | $850 | Average |
| 💝 Gifts & Cash Support | $610 | Average |
| 🛍️ Shopping / Marketplace | $430 | Average |
| 📦 Amazon Orders | $300 | Average |
| 🍽️ Dining & Delivery | $240 | Average |
| 🎬 Entertainment | $170 | Average |
| 🚕 Rideshare & Transit | $100 | Average |
| ⛽ Gas | $85 | Average |
| 🎓 Education | $70 | Average |
| 🏋️ Gym Membership | $42 | Fixed |
| **TOTAL** | **~$5,360/mo** | — |

> ⚠️ **Problem:** This totals ~$5,360/mo but your income appears to be ~$11K/mo. The recommendations are reasonable — you should apply them via the MCP `apply-budget-plan` tool and then adjust from there.

### 3. 🏠 Fix Empty Housing Subcategories

Your HOUSING group has 4 categories but only Rent has transactions:
- **Utilities** — $0 (do you pay these? Check if they're miscategorized)
- **Home Goods** — $0 (check Amazon orders for household items)
- **Renters Insurance** — $0 (are you covered? If yes, where is it tracked?)

**Action:** Search transactions for utility company names. You may be paying utilities through a payee that's categorized elsewhere.

### 4. 🚨 Fund Your Emergency Fund

Your Emergency Fund has **$0.20**. With ~$11K/mo income and ~$5K/mo expenses, you have room to build this up.

**Target:** 3 months of expenses = **$15,000–$18,000**
**Plan:** Budget $1,000–2,000/month to Emergency Fund until you hit the target. Your CIT HYSA ($23,742) could serve as the actual savings vehicle — just budget for it.

### 5. 🏦 Reconcile Your Accounts

Several accounts show significant discrepancies:
- **Wells Fargo Checking**: Actual says $1,799.20, bank reports $65.44 — **$1,733 off!**
- **Apple Card**: Actual says $5,063.63, bank reports -$837.54 — **$5,901 off!**

**Action:** Run bank sync via your MCP server, then manually reconcile each account in Actual.

### 6. 📊 Consolidate Accounts

You have **18 accounts** across 5+ banks. This is complex to track. Consider:
- Do you need both Chase Checking AND 4 other checking accounts?
- Could you consolidate to 2-3 checking accounts + 1 savings + 2-3 credit cards?
- Close unused accounts to reduce reconciliation overhead

### 7. 🏷️ Triage Uncategorized Transactions

Your MCP server has an `audit-uncategorized-transactions` tool that groups them into rule candidates. Run it monthly to:
- Create rules for recurring payees
- Categorize one-offs
- Keep your categories accurate

### 8. 📅 Set Up Scheduled Transactions

For predictable monthly expenses, create scheduled transactions in Actual:
- **Rent**: $1,240/month to University Realty
- **Gym**: ~$42/month
- **Car Insurance**: your quarterly/monthly premium
- **Subscriptions**: recurring services

This helps Actual predict your future cash flow.

---

## 🔧 MCP Server Improvements

### High Priority

| Improvement | Impact | Effort |
|-------------|--------|--------|
| **Fix connection drops** (#239/#252) | Users silently lose data | Medium |
| **Add `bank-sync` tool** | Enable automated syncing | Medium |
| **Structured JSON for all tools** | Better parsing in apps | Medium |
| **Fix spending-by-category** (needs `startDate`) | Enable category analysis | Low |

### Medium Priority

| Improvement | Impact | Effort |
|-------------|--------|--------|
| **Add `reconcile-account` tool** | Complete the workflow | Medium |
| **Add batch budget tool** | Set all categories at once | Low |
| **Add net-worth tracking** | Long-term wealth view | Medium |
| **Rate limiting / caching** | Performance on Render free tier | Medium |

### Nice to Have

| Improvement | Impact | Effort |
|-------------|--------|--------|
| **Webhook support** for transaction alerts | Real-time notifications | High |
| **Multi-budget support** | Shared budgets | High |
| **Export/backup tool** | Data safety | Low |
| **Fix emoji rendering** ("?? Health Insurance") | Polish | Low |

---

## ⚡ Quick Wins (Do Today)

1. **Apply the budget plan** — Use the MCP tester in your Automation Hub to call `apply-budget-plan` for May
2. **Run bank sync** — Sync all accounts to get latest transactions
3. **Reconcile Wells Fargo & Apple Card** — Fix the $7,600+ in discrepancies
4. **Fund Emergency Fund** — Transfer $1,000 to start
5. **Merge PR #252** — Fix the connection drops in your MCP server
6. **Run `audit-uncategorized-transactions`** — Find rule candidates

---

## 📈 Monthly Budget Routine (Going Forward)

1. **1st of month:** Allocate budget using `recommend-budget-plan` → `apply-budget-plan`
2. **Weekly:** Run bank sync + quick reconciliation
3. **15th of month:** Mid-month check — review spending vs budget, adjust if needed
4. **End of month:** Full reconciliation + review overspending + cover or roll over

> 💡 **Pro tip:** You could automate steps 1 and 2 with scheduled triggers in your Automation Hub!
