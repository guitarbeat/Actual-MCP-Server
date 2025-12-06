# Requirements Document

## Introduction

This document specifies the requirements for preparing a Chase checking account CSV file for import into Actual Budget. The system must transform the Chase-specific CSV format into a cleaned, optimized format with intelligent budget categorization using LLM analysis. The output will include a starting balance, cleaned payee names, and AI-suggested budget categories based on transaction patterns and descriptions.

## Glossary

- **CSV Import Tool**: The Actual Budget feature that allows users to import transactions from CSV files
- **Chase CSV**: The CSV file format exported from Chase bank containing transaction history
- **Transaction Record**: A single row in the CSV representing one financial transaction
- **Payee**: The merchant or entity involved in a transaction
- **Amount Field**: The monetary value of a transaction (positive for credits, negative for debits)
- **Date Field**: The posting date when the transaction was processed by the bank
- **Starting Balance**: The account balance at the beginning of the transaction history period
- **Budget Category**: A classification of spending or income that helps organize transactions for budgeting purposes
- **LLM Categorization Engine**: An AI system that analyzes transaction descriptions and patterns to suggest appropriate budget categories
- **Cleaned CSV**: The output CSV file with processed payee names, categorizations, and proper formatting

## Requirements

### Requirement 1

**User Story:** As a user, I want to import my Chase checking transactions into Actual Budget, so that I can track my finances in one place

#### Acceptance Criteria

1. WHEN the CSV file is provided, THE CSV Import Tool SHALL preserve all transaction data including date, description, and amount
2. THE CSV Import Tool SHALL maintain the original transaction order from the Chase CSV
3. THE CSV Import Tool SHALL ensure all date values are in a format compatible with Actual Budget (YYYY-MM-DD or MM/DD/YYYY)
4. THE CSV Import Tool SHALL preserve negative values for debits and positive values for credits
5. THE CSV Import Tool SHALL include all required fields for successful import into Actual Budget

### Requirement 2

**User Story:** As a user, I want the payee names to be clean and readable, so that I can easily identify transactions

#### Acceptance Criteria

1. THE CSV Import Tool SHALL extract the primary payee name from the Description field by identifying the first meaningful text segment
2. THE CSV Import Tool SHALL remove excessive whitespace and normalize spacing in payee names
3. THE CSV Import Tool SHALL create a separate Payee column containing the cleaned payee name
4. THE CSV Import Tool SHALL preserve the complete original description in a Notes or Description column
5. WHERE a transaction contains identifiers (PPD ID, WEB ID, transaction numbers), THE CSV Import Tool SHALL separate these into a notes field
6. WHERE a transaction has a Check or Slip number, THE CSV Import Tool SHALL include this in the notes field

### Requirement 2.1

**User Story:** As a user, I want Zelle and transfer transactions to show clear payee information, so that I know who I sent money to or received money from

#### Acceptance Criteria

1. WHEN a transaction description contains "Zelle payment to", THE CSV Import Tool SHALL extract the recipient name as the payee
2. WHEN a transaction description contains "Zelle payment from", THE CSV Import Tool SHALL extract the sender name as the payee
3. WHEN a transaction is an account transfer, THE CSV Import Tool SHALL indicate the transfer type and destination account as the payee
4. THE CSV Import Tool SHALL remove reference codes from Zelle payee names while preserving the person's name

### Requirement 2.2

**User Story:** As a user, I want recurring payments to be easily identifiable, so that I can track my regular expenses

#### Acceptance Criteria

1. WHEN a transaction is from a known recurring payee (Robinhood Card, APPLECARD GSBANK, GRANDE COMMUNICA, BILTPYMTS), THE CSV Import Tool SHALL extract the primary merchant name
2. THE CSV Import Tool SHALL remove payment processing details (PAYMENT, PPD ID, WEB ID) from the payee name
3. THE CSV Import Tool SHALL preserve payment reference numbers in the notes field

### Requirement 3

**User Story:** As a user, I want to avoid importing duplicate transactions, so that my account balance remains accurate

#### Acceptance Criteria

1. THE CSV Import Tool SHALL retain unique transaction identifiers where available
2. THE CSV Import Tool SHALL maintain the exact posting date from Chase
3. THE CSV Import Tool SHALL preserve the exact amount to enable duplicate detection
4. THE CSV Import Tool SHALL keep the transaction description intact for matching purposes

### Requirement 4

**User Story:** As a user, I want the CSV to be properly formatted, so that Actual Budget can successfully parse and import it

#### Acceptance Criteria

1. THE CSV Import Tool SHALL ensure the file has a header row with column names optimized for Actual Budget (Date, Payee, Notes, Amount)
2. THE CSV Import Tool SHALL ensure all rows have the same number of columns
3. THE CSV Import Tool SHALL escape any special characters that might break CSV parsing
4. THE CSV Import Tool SHALL use standard CSV delimiters (commas)
5. THE CSV Import Tool SHALL handle quoted fields properly when they contain commas

### Requirement 5

**User Story:** As a user, I want intelligent budget categories suggested for each transaction, so that I can quickly organize my spending without manual categorization

#### Acceptance Criteria

1. THE LLM Categorization Engine SHALL analyze each transaction's payee, description, amount, and type to suggest an appropriate budget category
2. THE LLM Categorization Engine SHALL recognize common spending patterns (groceries, utilities, rent, entertainment, transportation, etc.)
3. THE LLM Categorization Engine SHALL distinguish between income and expense categories based on transaction direction
4. THE LLM Categorization Engine SHALL identify recurring payments and categorize them consistently
5. THE LLM Categorization Engine SHALL provide specific, actionable category names (e.g., "Rent/Mortgage", "Internet/Cable", "Groceries") rather than generic labels

### Requirement 5.1

**User Story:** As a user, I want income transactions properly categorized, so that I can track my income sources

#### Acceptance Criteria

1. WHEN a transaction is from "UNIV TX AUSTIN PAYROLL", THE LLM Categorization Engine SHALL categorize it as "Income: Salary"
2. WHEN a transaction is a Zelle payment received, THE LLM Categorization Engine SHALL categorize it as "Income: Personal Transfer" or suggest a more specific category based on context
3. WHEN a transaction is interest payment, THE LLM Categorization Engine SHALL categorize it as "Income: Interest"
4. WHEN a transaction is a refund or fee reversal, THE LLM Categorization Engine SHALL categorize it as "Income: Refund"

### Requirement 5.2

**User Story:** As a user, I want expense transactions intelligently categorized by type, so that I can see where my money goes

#### Acceptance Criteria

1. WHEN a transaction is to "BILTPYMTS" with amount >= $1000, THE LLM Categorization Engine SHALL categorize it as "Housing: Rent"
2. WHEN a transaction is to "BILTPYMTS" with amount < $1000, THE LLM Categorization Engine SHALL analyze the amount and context to categorize as "Utilities: Gas" or other appropriate utility category
3. WHEN a transaction is to "GRANDE COMMUNICA" or "ASTOUND", THE LLM Categorization Engine SHALL categorize it as "Utilities: Internet/Cable"
4. WHEN a transaction is to "APPLECARD GSBANK" or credit card payments, THE LLM Categorization Engine SHALL categorize it as "Debt Payment: Credit Card"
5. WHEN a transaction is to "Robinhood Card", THE LLM Categorization Engine SHALL analyze the pattern and categorize as "Shopping" or more specific category based on amount patterns
6. WHEN a transaction is a bank fee, THE LLM Categorization Engine SHALL categorize it as "Fees: Bank Fees"
7. WHEN a transaction is an account transfer, THE LLM Categorization Engine SHALL categorize it as "Transfer: Internal" and mark it to avoid double-counting

### Requirement 6

**User Story:** As a user, I want to know my starting balance, so that I can reconcile my account properly in Actual Budget

#### Acceptance Criteria

1. THE CSV Import Tool SHALL calculate the starting balance by using the balance from the earliest transaction and subtracting that transaction's amount
2. THE CSV Import Tool SHALL include the starting balance as the first row in the output CSV with a special transaction type
3. THE CSV Import Tool SHALL clearly label the starting balance entry with date, description "Starting Balance", and the calculated amount
4. THE CSV Import Tool SHALL ensure the starting balance allows for accurate balance reconciliation throughout the transaction history

### Requirement 7

**User Story:** As a user, I want a clean, well-formatted CSV file, so that I can easily import it into Actual Budget

#### Acceptance Criteria

1. THE CSV Import Tool SHALL output a CSV with columns: Date, Payee, Category, Notes, Amount
2. THE CSV Import Tool SHALL sort transactions chronologically from oldest to newest
3. THE CSV Import Tool SHALL remove the Balance column from Chase CSV as Actual Budget calculates this automatically
4. THE CSV Import Tool SHALL save the cleaned CSV with a descriptive filename (e.g., "ChaseChecking_Cleaned_YYYY-MM-DD.csv")
5. THE CSV Import Tool SHALL ensure all text fields are properly quoted to handle commas and special characters
