#!/usr/bin/env python3
"""
Amazon Prime Credit Card Reconciliation Script
Compares transactions from bank CSV vs manually tracked CSV
"""

import csv
from datetime import datetime
from collections import defaultdict

def parse_date(date_str):
    """Parse date from MM/DD/YYYY format"""
    try:
        return datetime.strptime(date_str, '%m/%d/%Y')
    except:
        try:
            return datetime.strptime(date_str, '%Y-%m-%d')
        except:
            return None

def load_bank_csv(filename):
    """Load transactions from bank CSV (amazon-bank.CSV)"""
    transactions = []
    with open(filename, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            trans_date = parse_date(row['Transaction Date'])
            if trans_date:
                transactions.append({
                    'date': trans_date,
                    'description': row['Description'],
                    'amount': float(row['Amount']),
                    'type': row['Type'],
                    'category': row['Category'],
                    'source': 'bank'
                })
    return transactions

def load_manual_csv(filename):
    """Load transactions from manually tracked CSV (💳-Amazon-Prime.csv)"""
    transactions = []
    with open(filename, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            trans_date = parse_date(row['Date'])
            if trans_date and row['Payee'] != 'Starting Balance':
                transactions.append({
                    'date': trans_date,
                    'description': row['Payee'] + ' - ' + row['Notes'],
                    'amount': float(row['Amount']),
                    'type': 'Payment' if float(row['Amount']) > 0 else 'Sale',
                    'category': row['Category'],
                    'source': 'manual'
                })
    return transactions

def match_transactions(bank_trans, manual_trans, date_tolerance_days=2):
    """Match transactions between bank and manual records"""
    matched = []
    unmatched_bank = []
    unmatched_manual = list(manual_trans)
    
    for b_trans in bank_trans:
        found_match = False
        for m_trans in unmatched_manual[:]:
            # Check if amounts match exactly
            if abs(b_trans['amount'] - m_trans['amount']) < 0.01:
                # Check if dates are within tolerance
                date_diff = abs((b_trans['date'] - m_trans['date']).days)
                if date_diff <= date_tolerance_days:
                    matched.append({
                        'bank': b_trans,
                        'manual': m_trans,
                        'date_diff': date_diff
                    })
                    unmatched_manual.remove(m_trans)
                    found_match = True
                    break
        
        if not found_match:
            unmatched_bank.append(b_trans)
    
    return matched, unmatched_bank, unmatched_manual

def print_summary(matched, unmatched_bank, unmatched_manual):
    """Print reconciliation summary"""
    print("=" * 80)
    print("AMAZON PRIME CREDIT CARD RECONCILIATION")
    print("=" * 80)
    print()
    
    print(f"✓ Matched transactions: {len(matched)}")
    print(f"✗ In bank but not manual: {len(unmatched_bank)}")
    print(f"✗ In manual but not bank: {len(unmatched_manual)}")
    print()
    
    if unmatched_bank:
        print("=" * 80)
        print("TRANSACTIONS IN BANK BUT NOT IN MANUAL TRACKING")
        print("=" * 80)
        bank_total = 0
        for trans in sorted(unmatched_bank, key=lambda x: x['date']):
            print(f"{trans['date'].strftime('%Y-%m-%d')} | ${trans['amount']:>8.2f} | {trans['description'][:50]}")
            bank_total += trans['amount']
        print(f"\nTotal: ${bank_total:.2f}")
        print()
    
    if unmatched_manual:
        print("=" * 80)
        print("TRANSACTIONS IN MANUAL TRACKING BUT NOT IN BANK")
        print("=" * 80)
        manual_total = 0
        for trans in sorted(unmatched_manual, key=lambda x: x['date']):
            print(f"{trans['date'].strftime('%Y-%m-%d')} | ${trans['amount']:>8.2f} | {trans['description'][:50]}")
            manual_total += trans['amount']
        print(f"\nTotal: ${manual_total:.2f}")
        print()
    
    # Calculate balance difference
    bank_sum = sum(t['amount'] for t in unmatched_bank)
    manual_sum = sum(t['amount'] for t in unmatched_manual)
    diff = bank_sum - manual_sum
    
    print("=" * 80)
    print("BALANCE ANALYSIS")
    print("=" * 80)
    print(f"Unmatched bank transactions total:   ${bank_sum:>10.2f}")
    print(f"Unmatched manual transactions total: ${manual_sum:>10.2f}")
    print(f"Difference:                           ${diff:>10.2f}")
    print()

if __name__ == '__main__':
    # Load both files
    bank_trans = load_bank_csv('amazon-bank.CSV')
    manual_trans = load_manual_csv('💳-Amazon-Prime.csv')
    
    print(f"Loaded {len(bank_trans)} transactions from bank CSV")
    print(f"Loaded {len(manual_trans)} transactions from manual CSV")
    print()
    
    # Match transactions
    matched, unmatched_bank, unmatched_manual = match_transactions(bank_trans, manual_trans)
    
    # Print results
    print_summary(matched, unmatched_bank, unmatched_manual)
