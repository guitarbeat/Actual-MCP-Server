# Design Document: Chase CSV Import Preparation Tool

## Overview

This tool transforms Chase checking account CSV exports into cleaned, categorized CSV files optimized for Actual Budget import. The system uses an LLM-based categorization engine to intelligently suggest budget categories based on transaction patterns, payee information, and spending behavior. The output includes a starting balance entry and properly formatted transaction data ready for seamless import.

## Architecture

### High-Level Flow

```
Chase CSV Input
    ↓
CSV Parser
    ↓
Transaction Processor
    ↓
Payee Cleaner → LLM Categorization Engine
    ↓
Balance Calculator
    ↓
CSV Formatter
    ↓
Cleaned CSV Output
```

### Component Interaction

1. **CSV Parser**: Reads the Chase CSV and validates structure
2. **Transaction Processor**: Extracts and normalizes transaction data
3. **Payee Cleaner**: Removes noise and extracts meaningful payee names
4. **LLM Categorization Engine**: Analyzes transactions and suggests categories
5. **Balance Calculator**: Determines starting balance from transaction history
6. **CSV Formatter**: Generates the final cleaned CSV with proper formatting

## Components and Interfaces

### 1. CSV Parser

**Purpose**: Read and validate the Chase CSV file structure

**Interface**:
```typescript
interface ChaseTransaction {
  details: string;           // DEBIT, CREDIT, DSLIP
  postingDate: string;       // MM/DD/YYYY
  description: string;       // Full transaction description
  amount: number;            // Positive for credits, negative for debits
  type: string;              // ACH_DEBIT, MISC_CREDIT, etc.
  balance: number;           // Account balance after transaction
  checkOrSlip: string;       // Check/slip number if applicable
}

function parseChaseCSV(filePath: string): ChaseTransaction[]
```

**Responsibilities**:
- Read CSV file from disk
- Parse header and validate expected columns
- Convert each row into ChaseTransaction objects
- Handle malformed rows gracefully
- Sort transactions by date (oldest first)

### 2. Payee Cleaner

**Purpose**: Extract clean, readable payee names from Chase descriptions

**Interface**:
```typescript
interface CleanedPayee {
  payee: string;        // Cleaned payee name
  notes: string;        // Additional details (IDs, reference numbers)
}

function cleanPayeeName(description: string, type: string): CleanedPayee
```

**Responsibilities**:
- Extract primary merchant/payee name from description
- Remove excessive whitespace and normalize formatting
- Separate reference IDs (PPD ID, WEB ID) into notes
- Handle special cases:
  - Zelle payments: Extract sender/recipient name
  - Account transfers: Format as "Transfer to/from [Account]"
  - Recurring payments: Extract merchant name only
  - Check deposits: Format as "Check Deposit"

**Cleaning Rules**:
- Remove "PPD ID:", "WEB ID:", "CTX ID:" and their values → move to notes
- Remove "PAYMENT", "AUTOPAY", "ONLINE PMT" suffixes
- Extract person names from Zelle transactions
- Trim whitespace and collapse multiple spaces
- Capitalize properly (Title Case for names)

### 3. LLM Categorization Engine

**Purpose**: Intelligently categorize transactions using AI analysis

**Interface**:
```typescript
interface CategorySuggestion {
  category: string;          // Suggested budget category
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string;        // Optional explanation
}

function categorizeTransaction(
  payee: string,
  description: string,
  amount: number,
  type: string,
  historicalContext?: ChaseTransaction[]
): CategorySuggestion
```

**Responsibilities**:
- Analyze transaction details to suggest appropriate categories
- Use pattern recognition for recurring transactions
- Consider transaction type and amount for context (especially for multi-purpose payees like BILTPYMTS)
- Apply amount-based logic for payees that handle multiple bill types
- Provide consistent categorization for similar transactions
- Handle edge cases and ambiguous transactions

**Category Taxonomy**:

Income Categories:
- Income: Salary
- Income: Freelance/Contract
- Income: Interest
- Income: Refund
- Income: Personal Transfer
- Income: Other

Expense Categories:
- Housing: Rent
- Housing: Mortgage
- Utilities: Internet/Cable
- Utilities: Electric
- Utilities: Gas
- Utilities: Water
- Utilities: Phone
- Transportation: Gas
- Transportation: Public Transit
- Transportation: Parking
- Transportation: Car Payment
- Food: Groceries
- Food: Dining Out
- Food: Coffee/Snacks
- Shopping: General
- Shopping: Clothing
- Shopping: Electronics
- Shopping: Home Goods
- Entertainment: Streaming Services
- Entertainment: Events
- Entertainment: Hobbies
- Healthcare: Medical
- Healthcare: Pharmacy
- Healthcare: Insurance
- Debt Payment: Credit Card
- Debt Payment: Student Loan
- Debt Payment: Personal Loan
- Fees: Bank Fees
- Fees: Service Fees
- Transfer: Internal
- Transfer: Savings
- Uncategorized

**Categorization Strategy**:

The LLM will use a multi-step approach:

1. **Pattern Matching with Amount Context**: Check for known recurring payees with amount-based logic
   - UNIV TX AUSTIN PAYROLL → Income: Salary
   - BILTPYMTS with amount >= $1000 → Housing: Rent
   - BILTPYMTS with amount < $1000 → Analyze further (likely Utilities: Gas or other utilities)
   - GRANDE COMMUNICA/ASTOUND → Utilities: Internet/Cable
   - APPLECARD GSBANK/CHASE CREDIT CRD → Debt Payment: Credit Card

2. **Transaction Type Analysis**:
   - ACCT_XFER → Transfer: Internal
   - FEE_TRANSACTION → Fees: Bank Fees
   - REFUND_TRANSACTION → Income: Refund
   - MISC_CREDIT with "INTEREST" → Income: Interest

3. **Contextual Analysis**:
   - Analyze payee name for keywords (grocery, restaurant, gas, etc.)
   - Consider amount patterns (small recurring = subscription, large one-time = major purchase)
   - Look at historical patterns for the same payee

4. **LLM Prompt Structure**:
```
Analyze this transaction and suggest a budget category:
- Payee: {payee}
- Description: {description}
- Amount: {amount}
- Type: {type}
- Date: {date}

Based on the payee name, transaction type, and amount, suggest the most appropriate budget category from the provided taxonomy. Consider:
1. Is this income or an expense?
2. What type of merchant or service is this?
3. Are there any patterns that indicate the category?
4. For BILTPYMTS: amounts around $1240 are typically rent, while smaller amounts (under $100) are typically utilities like gas or other utility bills

Special rules:
- BILTPYMTS with amount >= $1000: Categorize as "Housing: Rent"
- BILTPYMTS with amount < $1000: Analyze the amount pattern - likely "Utilities: Gas" or other utility category

Respond with just the category name from the taxonomy.
```

### 4. Balance Calculator

**Purpose**: Calculate the starting balance for account reconciliation

**Interface**:
```typescript
interface StartingBalanceEntry {
  date: string;
  payee: string;
  category: string;
  notes: string;
  amount: number;
}

function calculateStartingBalance(transactions: ChaseTransaction[]): StartingBalanceEntry
```

**Responsibilities**:
- Find the earliest transaction in the dataset
- Calculate starting balance: `earliest_balance - earliest_amount`
- Create a special transaction entry for the starting balance
- Set date to one day before the earliest transaction

**Calculation Logic**:
```
Starting Balance = Balance After First Transaction - First Transaction Amount

Example:
First transaction: 11/17/2023, Amount: +2351.69, Balance: 32243.03
Starting Balance = 32243.03 - 2351.69 = 29891.34
```

### 5. Transaction Processor

**Purpose**: Orchestrate the transformation of each transaction

**Interface**:
```typescript
interface ProcessedTransaction {
  date: string;              // YYYY-MM-DD format
  payee: string;             // Cleaned payee name
  category: string;          // LLM-suggested category
  notes: string;             // Original description + reference IDs
  amount: number;            // Transaction amount
}

function processTransaction(
  transaction: ChaseTransaction,
  llmClient: LLMClient
): ProcessedTransaction
```

**Responsibilities**:
- Convert date format from MM/DD/YYYY to YYYY-MM-DD
- Call Payee Cleaner to extract payee and notes
- Call LLM Categorization Engine for category suggestion
- Combine original description with extracted notes
- Format amount consistently

### 6. CSV Formatter

**Purpose**: Generate the final cleaned CSV file

**Interface**:
```typescript
function formatCleanedCSV(
  startingBalance: StartingBalanceEntry,
  transactions: ProcessedTransaction[],
  outputPath: string
): void
```

**Responsibilities**:
- Create CSV header: Date,Payee,Category,Notes,Amount
- Add starting balance as first row
- Add all processed transactions in chronological order
- Properly quote fields containing commas or special characters
- Write to output file with UTF-8 encoding

**Output Format**:
```csv
Date,Payee,Category,Notes,Amount
2023-11-16,Starting Balance,Transfer: Internal,Opening balance for account,29891.34
2023-11-17,FEI Company,Income: Salary,"FEI COMPANY DIRECT DEP PPD ID: 9111111101",2351.69
2023-11-20,Apple Savings,Transfer: Savings,"APPLE GS SAVINGS TRANSFER 910161010054 WEB ID: 2222229999",-20000.00
...
```

## Data Models

### Input Model (Chase CSV)
```
Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
CREDIT,11/17/2023,"FEI COMPANY DIRECT DEP PPD ID: 9111111101",2351.69,ACH_CREDIT,32243.03,,
```

### Output Model (Cleaned CSV)
```
Date,Payee,Category,Notes,Amount
2023-11-17,FEI Company,Income: Salary,"FEI COMPANY DIRECT DEP PPD ID: 9111111101",2351.69
```

### Internal Transaction Model
```typescript
interface Transaction {
  // Input fields
  rawDate: string;
  rawDescription: string;
  rawAmount: number;
  rawType: string;
  rawBalance: number;
  
  // Processed fields
  date: string;
  payee: string;
  category: string;
  notes: string;
  amount: number;
}
```

## Error Handling

### CSV Parsing Errors
- **Missing columns**: Throw error with clear message about expected format
- **Invalid date format**: Log warning, attempt to parse, skip if unable
- **Invalid amount**: Log warning, skip transaction
- **Empty file**: Throw error indicating no transactions found

### LLM Categorization Errors
- **API timeout**: Retry up to 3 times with exponential backoff
- **Invalid response**: Default to "Uncategorized" category
- **Rate limiting**: Implement batch processing with delays
- **Connection error**: Log error, use fallback rule-based categorization

### File I/O Errors
- **Input file not found**: Throw error with file path
- **Output file write error**: Throw error with permissions check
- **Encoding issues**: Use UTF-8 with BOM for compatibility

### Data Validation Errors
- **Negative balance**: Log warning but continue processing
- **Missing required fields**: Skip transaction and log warning
- **Duplicate transactions**: Keep all, let Actual Budget handle deduplication

## Testing Strategy

### Unit Tests

1. **CSV Parser Tests**
   - Parse valid Chase CSV
   - Handle malformed rows
   - Validate date parsing
   - Test amount parsing (positive/negative)

2. **Payee Cleaner Tests**
   - Clean standard merchant names
   - Extract Zelle sender/recipient
   - Handle account transfers
   - Remove reference IDs correctly
   - Test edge cases (empty, very long names)

3. **Balance Calculator Tests**
   - Calculate starting balance correctly
   - Handle single transaction
   - Handle multiple transactions
   - Test with different transaction orders

4. **CSV Formatter Tests**
   - Generate valid CSV output
   - Properly quote fields with commas
   - Handle special characters
   - Verify header row
   - Test empty transaction list

### Integration Tests

1. **End-to-End Processing**
   - Process complete Chase CSV file
   - Verify all transactions present in output
   - Validate starting balance calculation
   - Check category assignments
   - Verify output file format

2. **LLM Integration Tests**
   - Test categorization with real LLM
   - Verify consistent categorization for similar transactions
   - Test fallback behavior on LLM failure
   - Validate category taxonomy adherence

### Manual Testing

1. **Import into Actual Budget**
   - Import cleaned CSV into Actual Budget
   - Verify transactions appear correctly
   - Check starting balance reconciliation
   - Validate categories are useful
   - Test duplicate detection

2. **Data Quality Review**
   - Review payee name cleanliness
   - Verify category appropriateness
   - Check for any data loss
   - Validate date formatting

## Implementation Notes

### Technology Stack
- **Language**: TypeScript/Node.js
- **CSV Parsing**: `csv-parse` library
- **CSV Writing**: `csv-stringify` library
- **LLM Integration**: OpenAI API or similar
- **Date Handling**: `date-fns` library

### Performance Considerations
- Process transactions in batches for LLM calls (10-20 at a time)
- Cache category suggestions for identical payees
- Stream large CSV files instead of loading entirely into memory
- Implement progress reporting for long-running operations

### Configuration
```typescript
interface Config {
  inputFile: string;
  outputFile: string;
  llmModel: string;
  llmApiKey: string;
  batchSize: number;
  enableCaching: boolean;
}
```

### Future Enhancements
- Support for multiple bank formats (not just Chase)
- Machine learning to improve categorization over time
- User feedback loop to refine categories
- Web interface for easier use
- Automatic detection of recurring transactions
- Split transaction support
- Multi-currency handling
