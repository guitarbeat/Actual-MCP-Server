# Chase CSV Cleaner

A standalone tool to transform Chase checking account CSV exports into cleaned, categorized CSV files optimized for Actual Budget import.

## Features

- ✅ Parse Chase CSV exports
- ✅ Clean and normalize payee names
- ✅ AI-powered transaction categorization using LLM
- ✅ Calculate starting balance automatically
- ✅ Filter transactions by date range
- ✅ Set custom starting balance
- ✅ Comprehensive data validation
- ✅ Balance verification

## Installation

```bash
cd chase-csv-cleaner
npm install
```

## Usage

### Basic Usage

```bash
npm run csv-import -- --input ChaseChecking.CSV --api-key YOUR_API_KEY
```

### With Custom Date Range and Starting Balance

```bash
npm run csv-import -- \
  --input ChaseChecking.CSV \
  --output cleaned.csv \
  --start-date 2025-08-01 \
  --starting-balance 381.79 \
  --api-key YOUR_API_KEY
```

### Options

- `-i, --input <file>` - Input Chase CSV file (default: ChaseChecking.CSV)
- `-o, --output <file>` - Output cleaned CSV file (default: auto-generated)
- `-m, --model <model>` - LLM model to use (default: gpt-4o-mini)
- `-k, --api-key <key>` - LLM API key (or set LLM_API_KEY env var)
- `-b, --batch-size <size>` - Batch size for LLM calls (default: 10)
- `-d, --delay <ms>` - Delay between batches in ms (default: 1000)
- `--start-date <YYYY-MM-DD>` - Filter transactions from this date
- `--starting-balance <amount>` - Set custom starting balance
- `--no-cache` - Disable categorization caching
- `-h, --help` - Display help message

## Environment Variables

- `LLM_API_KEY` - LLM API key (required if not provided via --api-key)
- `LLM_MODEL` - LLM model to use
- `LLM_BATCH_SIZE` - Batch size for LLM calls
- `LLM_RATE_LIMIT_DELAY` - Delay between batches in milliseconds

## Supported LLM Models

- OpenAI: gpt-4o-mini, gpt-4o, gpt-4, gpt-3.5-turbo
- Google Gemini: gemini-2.0-flash-exp, gemini-1.5-pro
- Anthropic: claude-3-5-sonnet, claude-3-opus

## Output Format

The tool generates a CSV file with the following columns:
- Date (YYYY-MM-DD)
- Payee (cleaned name)
- Category (AI-suggested)
- Notes (original description + reference IDs)
- Amount (transaction amount)

## Importing to Actual Budget

1. Open Actual Budget
2. Go to your checking account
3. Click "Import"
4. Select the cleaned CSV file
5. Review and confirm the imported transactions

## Development

### Run Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test -- --run src/parser.test.ts
```

## Project Structure

```
chase-csv-cleaner/
├── src/
│   ├── main.ts                    # CLI entry point
│   ├── cli.ts                     # Command-line interface
│   ├── processor.ts               # Main processing orchestrator
│   ├── parser.ts                  # CSV parser
│   ├── payee-cleaner.ts           # Payee name cleaning
│   ├── categorization-engine.ts   # LLM categorization
│   ├── balance-calculator.ts      # Starting balance calculation
│   ├── csv-formatter.ts           # Output CSV formatting
│   ├── data-validator.ts          # Data validation
│   ├── error-handler.ts           # Error handling
│   └── types.ts                   # TypeScript interfaces
├── .kiro-specs/                   # Design and planning documents
└── README.md
```

## License

MIT
