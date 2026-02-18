# Chase CSV Import Preparation Tool

This tool transforms Chase checking account CSV exports into cleaned, categorized CSV files optimized for Actual Budget import.

## Features

- **Intelligent Payee Cleaning**: Extracts clean, readable payee names from transaction descriptions
- **LLM-Powered Categorization**: Uses AI to suggest appropriate budget categories
- **Starting Balance Calculation**: Automatically calculates and includes starting balance
- **Proper CSV Formatting**: Generates CSV files that import seamlessly into Actual Budget
- **Progress Reporting**: Real-time progress updates during processing
- **Error Handling**: Graceful handling of malformed data with detailed logging
- **Batch Processing**: Efficient LLM API usage with configurable batching

## Installation

```bash
# Install dependencies
npm install

# Set your OpenAI API key
export LLM_API_KEY="sk-..."
```

## Usage

### Basic Usage

```bash
# Process a Chase CSV file
npm run csv-import -- -i ChaseChecking.CSV
```

### Advanced Usage

```bash
# Specify output file and model
npm run csv-import -- -i input.csv -o output.csv -m gpt-4

# Disable caching and use larger batches
npm run csv-import -- -i input.csv --no-cache -b 20

# Use API key from command line
npm run csv-import -- -i input.csv -k sk-...

# Display help
npm run csv-import -- --help
```

## Command-Line Options

- `-i, --input <file>` - Input Chase CSV file (default: ChaseChecking.CSV)
- `-o, --output <file>` - Output cleaned CSV file (default: auto-generated)
- `-m, --model <model>` - LLM model to use (default: gpt-4o-mini)
- `-k, --api-key <key>` - OpenAI API key (or set LLM_API_KEY env var)
- `-b, --batch-size <size>` - Batch size for LLM calls (default: 10)
- `-d, --delay <ms>` - Delay between batches in ms (default: 1000)
- `--no-cache` - Disable categorization caching
- `-h, --help` - Display help message

## Environment Variables

- `LLM_API_KEY` - OpenAI API key (required if not provided via --api-key)
- `LLM_MODEL` - Model to use (default: gpt-4o-mini)
- `LLM_BATCH_SIZE` - Batch size for LLM calls (default: 10)
- `LLM_RATE_LIMIT_DELAY` - Delay between batches in ms (default: 1000)
- `ENABLE_CATEGORIZATION_CACHE` - Enable/disable caching (default: true)

## Output Format

The tool generates a CSV with the following columns:

- **Date**: Transaction date in YYYY-MM-DD format
- **Payee**: Cleaned payee name
- **Category**: AI-suggested budget category
- **Notes**: Original description and reference IDs
- **Amount**: Transaction amount (negative for debits, positive for credits)

The first row contains the starting balance, followed by all transactions in chronological order.

## Example Output

```csv
Date,Payee,Category,Notes,Amount
2023-11-16,Starting Balance,Transfer: Internal,Opening balance for account,29891.34
2023-11-17,FEI Company,Income: Salary,"FEI COMPANY DIRECT DEP PPD ID: 9111111101",2351.69
2023-11-20,Apple Savings,Transfer: Savings,"APPLE GS SAVINGS TRANSFER 910161010054 WEB ID: 2222229999",-20000.00
```

## Category Taxonomy

The tool uses a comprehensive category taxonomy including:

### Income Categories

- Income: Salary, Freelance/Contract, Interest, Refund, Personal Transfer, Other

### Expense Categories

- Housing: Rent, Mortgage
- Utilities: Internet/Cable, Electric, Gas, Water, Phone
- Transportation: Gas, Public Transit, Parking, Car Payment
- Food: Groceries, Dining Out, Coffee/Snacks
- Shopping: General, Clothing, Electronics, Home Goods
- Entertainment: Streaming Services, Events, Hobbies
- Healthcare: Medical, Pharmacy, Insurance
- Debt Payment: Credit Card, Student Loan, Personal Loan
- Fees: Bank Fees, Service Fees
- Transfer: Internal, Savings
- Uncategorized

## Importing into Actual Budget

1. Open Actual Budget
2. Navigate to your checking account
3. Click "Import" and select the generated CSV file
4. Review the imported transactions
5. Confirm the import

The starting balance will help reconcile your account properly.

## Troubleshooting

### API Key Issues

If you get an authentication error, make sure your OpenAI API key is set correctly:

```bash
export LLM_API_KEY="sk-..."
```

### Rate Limiting

If you encounter rate limiting errors, try:

- Reducing batch size: `-b 5`
- Increasing delay: `-d 2000`

### Malformed CSV

If the CSV parser fails, check that:

- The file is a valid Chase CSV export
- All required columns are present
- The file is not corrupted

## Programmatic Usage

You can also use the tool programmatically:

```typescript
import { processChaseCSV } from './csv-import/processor.js';
import { CSVImportConfig } from './csv-import/types.js';

const config: CSVImportConfig = {
  inputFile: 'ChaseChecking.CSV',
  outputFile: 'output.csv',
  llmModel: 'gpt-4o-mini',
  llmApiKey: process.env.LLM_API_KEY || '',
  batchSize: 10,
  rateLimitDelay: 1000,
  enableCaching: true,
};

const result = await processChaseCSV(config, (stage, current, total) => {
  console.log(`${stage}: ${current}/${total}`);
});

if (result.success) {
  console.log(`Processed ${result.transactionsProcessed} transactions`);
} else {
  console.error('Processing failed:', result.errors);
}
```

## Development Status

✅ **Complete** - All components implemented and ready for use

### Completed Components

1. ✅ CSV Parser - Reads and validates Chase CSV files
2. ✅ Payee Cleaner - Extracts clean payee names and handles special cases
3. ✅ LLM Categorization Engine - AI-powered transaction categorization
4. ✅ Balance Calculator - Calculates starting balance for reconciliation
5. ✅ Transaction Processor - Orchestrates the transformation pipeline
6. ✅ CSV Formatter - Generates properly formatted output CSV
7. ✅ CLI Interface - Command-line interface with options
8. ✅ Main Entry Point - End-to-end processing with progress reporting
