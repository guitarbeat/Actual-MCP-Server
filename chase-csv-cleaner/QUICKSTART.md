# Quick Start Guide

## Setup

1. Install dependencies (if not already installed in parent project):
   ```bash
   cd chase-csv-cleaner
   npm install
   ```

2. Get your Chase CSV file:
   - Log into Chase online banking
   - Go to your checking account
   - Download transactions as CSV
   - Save as `ChaseChecking.CSV` in this folder

## Basic Usage

### Process entire CSV file

```bash
npm run csv-import -- \
  --input ChaseChecking.CSV \
  --api-key YOUR_GEMINI_OR_OPENAI_KEY
```

### Process from a specific date with custom starting balance

```bash
npm run csv-import -- \
  --input ChaseChecking.CSV \
  --output cleaned.csv \
  --start-date 2025-08-01 \
  --starting-balance 381.79 \
  --api-key YOUR_API_KEY \
  --model gemini-2.0-flash-exp
```

## Finding Your Starting Balance

If you want to filter from a specific date, you need to know your balance on that date:

1. Look at your Chase CSV file
2. Find the first transaction on or after your desired start date
3. Look at the "Balance" column for that transaction
4. If there are multiple transactions on that date, use the balance BEFORE the first one

Example:
```
Date: 08/01/2025
First transaction: +$2,650.01 (payroll)
Balance after: $3,031.80
Starting balance = $3,031.80 - $2,650.01 = $381.79
```

## Verify Balance

After processing, verify the ending balance matches:

```bash
python3 verify_balance.py
```

## Import to Actual Budget

1. Open Actual Budget
2. Navigate to your checking account
3. Click "Import" button
4. Select your cleaned CSV file
5. Review transactions
6. Click "Import" to complete

## Troubleshooting

### Balance doesn't match
- Make sure you calculated the starting balance correctly
- Check if there are multiple transactions on your start date
- Use the balance BEFORE the first transaction of the day

### API errors
- Verify your API key is correct
- Check you have credits/quota remaining
- Try a different model (gemini-2.0-flash-exp is fast and cheap)

### Missing transactions
- Check your start date filter
- Verify the Chase CSV has all expected transactions
- Look for any error messages in the output
