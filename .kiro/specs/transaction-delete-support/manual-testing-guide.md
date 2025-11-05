# Manual Testing Guide: Transaction Delete Support

This guide provides comprehensive manual testing scenarios for the transaction delete feature. Use this to validate the implementation meets all requirements.

## Prerequisites

1. Actual Budget server running and accessible
2. MCP server configured with proper environment variables
3. Test budget with sample data
4. MCP client (e.g., Claude Desktop) connected to the server

## Test Environment Setup

Before starting tests, ensure you have:
- At least one account with transactions
- Various transaction types (regular, transfers, with subtransactions)
- Some reconciled transactions
- Test transactions you can safely delete

## Test Scenarios

### Test 1: Basic Delete Operation

**Objective**: Verify basic transaction deletion works correctly

**Steps**:
1. Create a test transaction:
   ```json
   {
     "operation": "create",
     "transaction": {
       "account": "Checking",
       "date": "2025-01-15",
       "amount": -5000,
       "payee": "Test Payee",
       "category": "Food",
       "notes": "Test transaction for deletion"
     }
   }
   ```
2. Note the transaction ID from the response
3. Delete the transaction:
   ```json
   {
     "operation": "delete",
     "id": "<transaction-id-from-step-2>"
   }
   ```

**Expected Results**:
- ✅ Deletion succeeds with confirmation message
- ✅ Message includes transaction ID
- ✅ Warning about permanent deletion is displayed
- ✅ Transaction no longer appears in account

**Requirements Verified**: 1.1, 1.2, 1.3, 1.4

---

### Test 2: Delete with Invalid Transaction ID

**Objective**: Verify error handling for non-existent transactions

**Steps**:
1. Attempt to delete with a fake ID:
   ```json
   {
     "operation": "delete",
     "id": "non-existent-transaction-id-12345"
   }
   ```

**Expected Results**:
- ✅ Operation fails with clear error message
- ✅ Error indicates transaction not found
- ✅ No side effects on other transactions

**Requirements Verified**: 1.4, 3.1, 7.2

---

### Test 3: Delete without Transaction ID

**Objective**: Verify validation for missing required field

**Steps**:
1. Attempt to delete without providing ID:
   ```json
   {
     "operation": "delete"
   }
   ```

**Expected Results**:
- ✅ Operation fails with validation error
- ✅ Error message clearly states ID is required
- ✅ Error message includes example format

**Requirements Verified**: 1.2, 3.1, 7.1

---

### Test 4: Delete Transfer Transaction

**Objective**: Verify both sides of transfer are handled correctly

**Steps**:
1. Create a transfer transaction between two accounts:
   - Use Actual Budget UI to create a transfer
   - Or create via API if transfer creation is supported
2. Note the transaction ID from one side of the transfer
3. Delete the transaction:
   ```json
   {
     "operation": "delete",
     "id": "<transfer-transaction-id>"
   }
   ```
4. Check both accounts in Actual Budget UI

**Expected Results**:
- ✅ Deletion succeeds
- ✅ Both sides of transfer are removed (handled by Actual API)
- ✅ No orphaned transfer transactions remain
- ✅ Account balances are correct

**Requirements Verified**: 3.3, 6.1

**Note**: The Actual Budget API automatically handles both sides of a transfer when one side is deleted.

---

### Test 5: Delete Transaction with Subtransactions

**Objective**: Verify parent and child transactions are handled correctly

**Steps**:
1. Create a split transaction with subtransactions:
   - Use Actual Budget UI to create a transaction with splits
   - Or create via API if supported
2. Note the parent transaction ID
3. Delete the parent transaction:
   ```json
   {
     "operation": "delete",
     "id": "<parent-transaction-id>"
   }
   ```
4. Verify in Actual Budget UI

**Expected Results**:
- ✅ Deletion succeeds
- ✅ Parent transaction is removed
- ✅ All subtransactions are also removed (handled by Actual API)
- ✅ No orphaned subtransactions remain

**Requirements Verified**: 3.4, 6.4

**Note**: The Actual Budget API automatically deletes subtransactions when the parent is deleted.

---

### Test 6: Delete Reconciled Transaction

**Objective**: Verify reconciled transactions can be deleted

**Steps**:
1. Create and reconcile a transaction:
   - Create a transaction
   - Mark it as reconciled in Actual Budget UI
2. Note the transaction ID
3. Delete the reconciled transaction:
   ```json
   {
     "operation": "delete",
     "id": "<reconciled-transaction-id>"
   }
   ```

**Expected Results**:
- ✅ Deletion succeeds
- ✅ Reconciled transaction is removed
- ✅ Account reconciliation status updates accordingly

**Requirements Verified**: 6.2

**Note**: The API allows deletion regardless of reconciliation status. Future enhancement could add a warning.

---

### Test 7: Cache Invalidation Verification

**Objective**: Verify transaction cache is properly invalidated after deletion

**Steps**:
1. Query transactions for an account:
   ```json
   {
     "account": "Checking",
     "start_date": "2025-01-01",
     "end_date": "2025-12-31"
   }
   ```
2. Note a transaction ID from the results
3. Delete that transaction:
   ```json
   {
     "operation": "delete",
     "id": "<transaction-id>"
   }
   ```
4. Query transactions again with same parameters
5. Verify the deleted transaction is not in the results

**Expected Results**:
- ✅ First query returns transaction
- ✅ Deletion succeeds
- ✅ Second query does not include deleted transaction
- ✅ Cache is properly invalidated (no stale data)

**Requirements Verified**: 2.5, 6.5

---

### Test 8: Confirmation Message Clarity

**Objective**: Verify deletion confirmation messages are clear and helpful

**Steps**:
1. Create a transaction with full details:
   ```json
   {
     "operation": "create",
     "transaction": {
       "account": "Checking",
       "date": "2025-01-20",
       "amount": -7599,
       "payee": "Amazon",
       "category": "Shopping",
       "notes": "Test purchase"
     }
   }
   ```
2. Delete the transaction and examine the response message

**Expected Results**:
- ✅ Message starts with success indicator (✓)
- ✅ Transaction ID is clearly displayed
- ✅ Warning about permanent deletion is prominent
- ✅ Message is easy to understand
- ✅ Formatting is consistent with other operations

**Requirements Verified**: 1.4, 3.2, 8.1, 8.2, 8.3, 8.5

---

### Test 9: Backward Compatibility - Create Operation

**Objective**: Verify create operation still works after adding delete

**Steps**:
1. Create a new transaction:
   ```json
   {
     "operation": "create",
     "transaction": {
       "account": "Checking",
       "date": "2025-01-25",
       "amount": -3000,
       "payee": "Coffee Shop",
       "category": "Dining"
     }
   }
   ```

**Expected Results**:
- ✅ Transaction is created successfully
- ✅ Response format is unchanged
- ✅ All create functionality works as before

**Requirements Verified**: 7.1, 7.3

---

### Test 10: Backward Compatibility - Update Operation

**Objective**: Verify update operation still works after adding delete

**Steps**:
1. Create a transaction (or use existing one)
2. Update the transaction:
   ```json
   {
     "operation": "update",
     "id": "<transaction-id>",
     "transaction": {
       "amount": -4000,
       "category": "Entertainment"
     }
   }
   ```

**Expected Results**:
- ✅ Transaction is updated successfully
- ✅ Response format is unchanged
- ✅ All update functionality works as before

**Requirements Verified**: 7.1, 7.3, 7.4

---

### Test 11: Write Permissions Check

**Objective**: Verify delete operation respects write permissions

**Steps**:
1. Configure MCP server with write permissions disabled (if possible)
2. Attempt to delete a transaction:
   ```json
   {
     "operation": "delete",
     "id": "<transaction-id>"
   }
   ```

**Expected Results**:
- ✅ Operation is blocked
- ✅ Error message indicates write permissions required
- ✅ No transaction is deleted

**Requirements Verified**: 1.5, 7.5

**Note**: This test requires the ability to toggle write permissions in your test environment.

---

### Test 12: Multiple Sequential Deletions

**Objective**: Verify multiple deletions work correctly

**Steps**:
1. Create 3 test transactions
2. Delete them one by one:
   ```json
   {"operation": "delete", "id": "<id-1>"}
   {"operation": "delete", "id": "<id-2>"}
   {"operation": "delete", "id": "<id-3>"}
   ```

**Expected Results**:
- ✅ All three deletions succeed
- ✅ Each deletion returns proper confirmation
- ✅ All three transactions are removed
- ✅ No interference between operations

**Requirements Verified**: 1.1, 1.3, 6.5

---

### Test 13: Delete After Query

**Objective**: Verify deletion works after querying transactions

**Steps**:
1. Query transactions to get a list
2. Select a transaction ID from the results
3. Delete that transaction
4. Query again to verify removal

**Expected Results**:
- ✅ Query returns transaction list
- ✅ Deletion succeeds
- ✅ Subsequent query shows transaction removed
- ✅ No errors or inconsistencies

**Requirements Verified**: 1.1, 1.3, 2.5

---

### Test 14: Error Message Quality

**Objective**: Verify all error messages are clear and actionable

**Test Cases**:
1. Missing ID: `{"operation": "delete"}`
2. Invalid ID format: `{"operation": "delete", "id": ""}`
3. Non-existent ID: `{"operation": "delete", "id": "fake-id-12345"}`

**Expected Results**:
- ✅ Each error has a clear message
- ✅ Messages explain what went wrong
- ✅ Messages suggest how to fix the issue
- ✅ No technical jargon or stack traces in user-facing errors

**Requirements Verified**: 3.1, 3.5, 7.1, 7.2

---

## Performance Testing

### Test 15: Deletion Performance

**Objective**: Verify deletion completes in reasonable time

**Steps**:
1. Delete a transaction and note the response time
2. Delete multiple transactions and compare times

**Expected Results**:
- ✅ Single deletion completes in < 500ms
- ✅ Performance is consistent across multiple deletions
- ✅ No significant performance degradation

**Requirements Verified**: 6.5

---

## Edge Cases

### Test 16: Scheduled Transaction Instance

**Objective**: Verify deleting a scheduled transaction instance doesn't affect the schedule

**Steps**:
1. Create a scheduled transaction (if supported)
2. Let it create an instance
3. Delete the instance transaction
4. Verify the schedule still exists and creates future instances

**Expected Results**:
- ✅ Instance is deleted
- ✅ Schedule remains active
- ✅ Future instances are still created

**Requirements Verified**: 6.3

**Note**: This test requires scheduled transaction support in your test environment.

---

### Test 17: Race Condition - Double Delete

**Objective**: Verify graceful handling of simultaneous delete requests

**Steps**:
1. Create a test transaction
2. Attempt to delete it twice in quick succession (if possible with your client)

**Expected Results**:
- ✅ First deletion succeeds
- ✅ Second deletion fails gracefully with "not found" error
- ✅ No system errors or crashes

**Requirements Verified**: 6.5

---

## Logging Verification

### Test 18: Verify Logging

**Objective**: Ensure delete operations are properly logged

**Steps**:
1. Enable performance logging if available
2. Delete a transaction
3. Check server logs

**Expected Results**:
- ✅ Deletion operation is logged
- ✅ Transaction ID is included in logs
- ✅ Operation duration is tracked
- ✅ Any errors are logged with context

**Requirements Verified**: 10.1, 10.2, 10.3, 10.5

---

## Test Results Summary

Use this checklist to track your testing progress:

- [ ] Test 1: Basic Delete Operation
- [ ] Test 2: Delete with Invalid Transaction ID
- [ ] Test 3: Delete without Transaction ID
- [ ] Test 4: Delete Transfer Transaction
- [ ] Test 5: Delete Transaction with Subtransactions
- [ ] Test 6: Delete Reconciled Transaction
- [ ] Test 7: Cache Invalidation Verification
- [ ] Test 8: Confirmation Message Clarity
- [ ] Test 9: Backward Compatibility - Create Operation
- [ ] Test 10: Backward Compatibility - Update Operation
- [ ] Test 11: Write Permissions Check
- [ ] Test 12: Multiple Sequential Deletions
- [ ] Test 13: Delete After Query
- [ ] Test 14: Error Message Quality
- [ ] Test 15: Deletion Performance
- [ ] Test 16: Scheduled Transaction Instance
- [ ] Test 17: Race Condition - Double Delete
- [ ] Test 18: Verify Logging

## Notes and Observations

Use this section to document any issues, unexpected behavior, or observations during testing:

---

## Sign-off

- **Tester Name**: _______________
- **Date**: _______________
- **All Tests Passed**: [ ] Yes [ ] No
- **Issues Found**: _______________
- **Additional Comments**: _______________
