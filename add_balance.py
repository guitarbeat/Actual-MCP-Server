#!/usr/bin/env python3
"""Add running balance column to Amazon bank CSV file."""

import csv
from datetime import datetime
from decimal import Decimal

def parse_amount(amount_str):
    """Parse amount string to Decimal, handling negative values."""
    return Decimal(amount_str.replace(',', ''))

def add_running_balance(input_file, output_file):
    """Add running balance column to CSV file."""
    
    # Read all transactions
    transactions = []
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            transactions.append(row)
    
    # Sort by transaction date (oldest first) to calculate balance correctly
    transactions.sort(key=lambda x: datetime.strptime(x['Transaction Date'], '%m/%d/%Y'))
    
    # Calculate running balance
    # Start with 0 and work forward
    balance = Decimal('0')
    for transaction in transactions:
        amount = parse_amount(transaction['Amount'])
        balance += amount
        transaction['Balance'] = f"{balance:.2f}"
    
    # Sort back to original order (newest first)
    transactions.sort(key=lambda x: datetime.strptime(x['Transaction Date'], '%m/%d/%Y'), reverse=True)
    
    # Write output with new Balance column
    new_fieldnames = list(fieldnames) + ['Balance']
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=new_fieldnames)
        writer.writeheader()
        writer.writerows(transactions)
    
    print(f"✓ Added running balance column")
    print(f"✓ Output written to: {output_file}")
    print(f"✓ Final balance: ${balance:.2f}")

if __name__ == '__main__':
    add_running_balance('amazon-bank.CSV', 'amazon-bank-with-balance.CSV')
