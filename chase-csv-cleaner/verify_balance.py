#!/usr/bin/env python3
"""
Verify that the cleaned CSV has the correct ending balance
"""
import csv
from decimal import Decimal

def verify_balance():
    # Read original Chase CSV and sum all amounts
    print("=" * 60)
    print("ORIGINAL CHASE CSV")
    print("=" * 60)
    
    original_amounts = []
    with open('ChaseChecking.CSV', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            amount = Decimal(row['Amount'])
            original_amounts.append(amount)
    
    original_sum = sum(original_amounts)
    print(f"Number of transactions: {len(original_amounts)}")
    print(f"Sum of all amounts: ${original_sum:,.2f}")
    print(f"Ending balance (from file): ${Decimal(original_amounts[0]):,.2f}")  # First row is most recent
    
    # Read cleaned CSV
    print("\n" + "=" * 60)
    print("CLEANED CSV")
    print("=" * 60)
    
    cleaned_amounts = []
    with open('ChaseChecking_Cleaned.csv', 'r') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        
        starting_balance_row = rows[0]
        starting_balance = Decimal(starting_balance_row['Amount'])
        print(f"Starting balance: ${starting_balance:,.2f}")
        
        # Skip starting balance, get all transactions
        for row in rows[1:]:
            amount = Decimal(row['Amount'])
            cleaned_amounts.append(amount)
    
    cleaned_sum = sum(cleaned_amounts)
    print(f"Number of transactions: {len(cleaned_amounts)}")
    print(f"Sum of all amounts: ${cleaned_sum:,.2f}")
    
    calculated_ending = starting_balance + cleaned_sum
    print(f"Calculated ending balance: ${calculated_ending:,.2f}")
    
    # Get actual ending balance from original
    with open('ChaseChecking.CSV', 'r') as f:
        reader = csv.DictReader(f)
        first_row = next(reader)  # Most recent transaction
        actual_ending = Decimal(first_row['Balance'])
    
    print("\n" + "=" * 60)
    print("COMPARISON")
    print("=" * 60)
    print(f"Original sum of amounts: ${original_sum:,.2f}")
    print(f"Cleaned sum of amounts:  ${cleaned_sum:,.2f}")
    print(f"Difference in sums:      ${abs(original_sum - cleaned_sum):,.2f}")
    print()
    print(f"Actual ending balance:      ${actual_ending:,.2f}")
    print(f"Calculated ending balance:  ${calculated_ending:,.2f}")
    print(f"Difference:                 ${abs(actual_ending - calculated_ending):,.2f}")
    
    if abs(actual_ending - calculated_ending) < Decimal('0.01'):
        print("\n✅ SUCCESS! Balances match!")
        return True
    else:
        print("\n❌ ERROR! Balances don't match!")
        
        # Find which transaction might be missing or duplicated
        print("\nChecking for missing/extra transactions...")
        if len(original_amounts) != len(cleaned_amounts):
            print(f"Transaction count mismatch: {len(original_amounts)} vs {len(cleaned_amounts)}")
        
        return False

if __name__ == '__main__':
    verify_balance()
