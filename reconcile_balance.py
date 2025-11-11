#!/usr/bin/env python3
"""Reconcile balance with actual Chase CC balance."""

import csv
from datetime import datetime
from decimal import Decimal

def parse_amount(amount_str):
    """Parse amount string to Decimal."""
    return Decimal(amount_str.replace(',', ''))

def reconcile_balance(input_file, current_balance):
    """Calculate what the starting balance should be."""
    
    # Read all transactions
    transactions = []
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            transactions.append(row)
    
    # Sort by transaction date (oldest first)
    transactions.sort(key=lambda x: datetime.strptime(x['Transaction Date'], '%m/%d/%Y'))
    
    # Calculate total change from all transactions
    total_change = Decimal('0')
    for transaction in transactions:
        amount = parse_amount(transaction['Amount'])
        total_change += amount
    
    # Work backwards: current_balance = starting_balance + total_change
    # So: starting_balance = current_balance - total_change
    starting_balance = current_balance - total_change
    
    print(f"Current balance (from Chase): ${current_balance:.2f}")
    print(f"Total change from transactions: ${total_change:.2f}")
    print(f"Calculated starting balance: ${starting_balance:.2f}")
    print(f"\nOldest transaction: {transactions[0]['Transaction Date']} - {transactions[0]['Description']}")
    print(f"Newest transaction: {transactions[-1]['Transaction Date']} - {transactions[-1]['Description']}")
    
    return starting_balance

def add_correct_balance(input_file, output_file, starting_balance):
    """Add running balance column with correct starting balance."""
    
    # Read all transactions
    transactions = []
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            transactions.append(row)
    
    # Sort by transaction date (oldest first)
    transactions.sort(key=lambda x: datetime.strptime(x['Transaction Date'], '%m/%d/%Y'))
    
    # Calculate running balance starting from the correct starting balance
    balance = starting_balance
    for transaction in transactions:
        amount = parse_amount(transaction['Amount'])
        balance += amount
        transaction['Balance'] = f"{balance:.2f}"
    
    # Sort back to original order (newest first)
    transactions.sort(key=lambda x: datetime.strptime(x['Transaction Date'], '%m/%d/%Y'), reverse=True)
    
    # Write output
    new_fieldnames = [f for f in fieldnames if f != 'Balance'] + ['Balance']
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=new_fieldnames)
        writer.writeheader()
        writer.writerows(transactions)
    
    print(f"\n✓ Updated balance column")
    print(f"✓ Output written to: {output_file}")
    print(f"✓ Final balance: ${balance:.2f}")

if __name__ == '__main__':
    current_balance = Decimal('418.05')
    
    print("=== Reconciling Balance ===\n")
    starting_balance = reconcile_balance('amazon-bank.CSV', current_balance)
    
    print("\n=== Updating CSV ===\n")
    add_correct_balance('amazon-bank.CSV', 'amazon-bank-with-balance.CSV', starting_balance)
