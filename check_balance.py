#!/usr/bin/env python3
"""
Check current balance for Amazon Prime credit card
"""

import csv
from datetime import datetime

def calculate_bank_balance(filename):
    """Calculate balance from bank CSV"""
    total = 0
    with open(filename, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            amount = float(row['Amount'])
            total += amount
    return total

def calculate_manual_balance(filename):
    """Calculate balance from manual CSV"""
    total = 0
    starting_balance = 0
    with open(filename, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['Payee'] == 'Starting Balance':
                starting_balance = float(row['Amount'])
            else:
                amount = float(row['Amount'])
                total += amount
    return starting_balance + total

# Calculate balances
bank_balance = calculate_bank_balance('amazon-bank.CSV')
manual_balance = calculate_manual_balance('💳-Amazon-Prime.csv')

print("=" * 80)
print("BALANCE COMPARISON")
print("=" * 80)
print()
print(f"Bank CSV total (all transactions):     ${bank_balance:>10.2f}")
print(f"Manual CSV total (with starting bal):  ${manual_balance:>10.2f}")
print()
print(f"Difference:                             ${abs(bank_balance - manual_balance):>10.2f}")
print()

# Now let's check just the overlapping period (Aug 5, 2025 onwards)
print("=" * 80)
print("OVERLAPPING PERIOD ONLY (Aug 5, 2025 onwards)")
print("=" * 80)
print()

overlap_total = 0
with open('amazon-bank.CSV', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        trans_date = datetime.strptime(row['Transaction Date'], '%m/%d/%Y')
        if trans_date >= datetime(2025, 8, 5):
            amount = float(row['Amount'])
            overlap_total += amount

print(f"Bank CSV (Aug 5, 2025 onwards):         ${overlap_total:>10.2f}")
print(f"Manual CSV (transactions only):         ${manual_balance - (-384.37):>10.2f}")
print()

# Show the starting balance
print("=" * 80)
print("STARTING BALANCE ANALYSIS")
print("=" * 80)
print()
print(f"Manual CSV starting balance:            ${-384.37:>10.2f}")
print()
print("This starting balance should represent the account balance")
print("as of August 5, 2025 BEFORE any transactions on that date.")
print()

# Calculate what the balance should have been on Aug 5
balance_before_aug5 = 0
with open('amazon-bank.CSV', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        trans_date = datetime.strptime(row['Transaction Date'], '%m/%d/%Y')
        if trans_date < datetime(2025, 8, 5):
            amount = float(row['Amount'])
            balance_before_aug5 += amount

print(f"Calculated balance before Aug 5, 2025:  ${balance_before_aug5:>10.2f}")
print()
print(f"Difference from manual starting bal:    ${abs(balance_before_aug5 - (-384.37)):>10.2f}")
