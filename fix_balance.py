#!/usr/bin/env python3
"""
Figure out the Amazon Prime balance discrepancy
"""

import csv
from datetime import datetime

print("=" * 80)
print("UNDERSTANDING THE BALANCE")
print("=" * 80)
print()

# What you're seeing:
print("What you told me:")
print(f"  Actual bank website shows:  $418.05 (you owe this)")
print(f"  Manual tracking shows:      $620.98 (you think you owe this)")
print(f"  Difference:                 $202.93")
print()

# Calculate from bank CSV
print("=" * 80)
print("FROM BANK CSV (amazon-bank.CSV)")
print("=" * 80)
print()

# Last payment
last_payment_date = datetime(2025, 10, 10)
last_payment_amount = 439.50

# Charges since last payment
charges = [
    ("2025-10-10", -33.34, "AMZN Mktp US*NF8LL2MG1"),
    ("2025-10-15", -14.99, "AMAZON MKTPL*NM17I8GW1"),
    ("2025-10-17", -15.14, "AMAZON MKTPL*NM5F57751"),
    ("2025-10-27", -16.38, "Amazon.com*N43MA3DE0"),
    ("2025-10-27", -8.65, "Amazon.com*N42AM4OY2"),
    ("2025-10-31", -16.23, "AMAZON MKTPL*NK9QW5NE1"),
    ("2025-11-02", -17.29, "Amazon.com*NK0VS3HX0"),
    ("2025-11-08", -12.98, "PP*SPOTIFY*P3C3700EDA"),
    ("2025-11-08", -7.57, "AMAZON PRIME*BT14S6VK1"),
]

total_charges = sum(c[1] for c in charges)
csv_balance = last_payment_amount + total_charges

print(f"Last payment (Oct 10):       ${last_payment_amount:.2f}")
print(f"Charges since payment:       ${total_charges:.2f}")
print(f"Balance per CSV:             ${csv_balance:.2f}")
print()

# The discrepancy
print("=" * 80)
print("DISCREPANCIES")
print("=" * 80)
print()
print(f"CSV says you owe:            ${csv_balance:.2f}")
print(f"Bank website says you owe:   $418.05")
print(f"Difference:                  ${418.05 - csv_balance:.2f}")
print()
print("This $121.12 is likely PENDING transactions not in the CSV yet.")
print()

# Now check manual tracking
print("=" * 80)
print("FROM MANUAL TRACKING (💳-Amazon-Prime.csv)")
print("=" * 80)
print()

manual_starting = -384.37
manual_transactions = -236.61  # From earlier calculation
manual_total = manual_starting + manual_transactions

print(f"Starting balance (Aug 5):    ${manual_starting:.2f}")
print(f"Transactions since Aug 5:    ${manual_transactions:.2f}")
print(f"Current balance:             ${manual_total:.2f}")
print()
print(f"Manual says you owe:         ${-manual_total:.2f}")
print()

# The real issue
print("=" * 80)
print("THE PROBLEM")
print("=" * 80)
print()
print(f"Actual bank:                 $418.05")
print(f"Manual tracking:             $620.98")
print(f"Difference:                  $202.93")
print()
print("Your manual tracking is showing $202.93 MORE than you actually owe.")
print()
print("This is because your STARTING BALANCE on Aug 5 was wrong.")
print()

# Calculate correct starting balance
# If manual transactions are correct, work backwards
correct_starting = -418.05 - manual_transactions
print(f"If your transactions since Aug 5 are correct (${manual_transactions:.2f}),")
print(f"then your starting balance should have been: ${correct_starting:.2f}")
print(f"But you entered: ${manual_starting:.2f}")
print(f"Difference: ${manual_starting - correct_starting:.2f}")
