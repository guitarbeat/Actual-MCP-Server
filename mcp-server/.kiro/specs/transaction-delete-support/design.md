# Design Document

## Overview

This design adds transaction deletion capability to the Actual Budget MCP Server by extending the existing `manage-transaction` tool with a 'delete' operation. The implementation follows established patterns from other entity deletion operations and maintains consistency with the existing transaction management architecture. The design prioritizes safety, clear user feedback, and minimal code changes.

## Architecture

### High-Level Design Principles

1. **Extend, Don't Replace**: Add delete to existing manage-transaction tool
2. **Follow Existing Patterns**: Mirror the structure of other delete operations
3. **Safety First**: Validate before deleting, provide clear confirmations
4. **Minimal Changes**: Leverage existing infrastructure where possible
5. **Backward Compatible**: No breaking changes to existing operations

### Component Overview

```
src/
├── actual-api.ts                          # MODIFIED: Add deleteTransaction wrapper
├── tools/
│   └── manage-transaction/
│       ├── index.ts                       # MODIFIED: Add 'delete' to operation enum
│       ├── types.ts                       # MODIFIED: Add delete operation type
│       ├── input-parser.ts                # MODIFIED: Handle delete validation
│       ├── data-fetcher.ts                # MODIFIED: Add deleteTransaction method
│       └── report-generator.ts            # MODIFIED: Add delete confirmation format
└── core/
    └── cache/
        └── cache-service.ts               # EXISTING: Already supports invalidation
```

## Components and Interfaces

### 1. API Wrapper (actual-api.ts)

Add a new exported function that wraps the Actual Budget API's deleteTransaction method.

```typescript
/**
 * Delete a transaction (ensures API is initialized)
 * 
 * @param id - Transaction ID to delete
 * @returns Promise that resolves when deletion is complete
 * @throws Error if transaction doesn't exist or deletion fails
 */
export async function deleteTransaction(id: string): Promise<void> {
  await initActualApi();
  
  // Call the underlying API method
  await api.deleteTransaction({ id });
  
  // Invalidate transaction cache
  // Note: We invalidate all transaction cache since we don't know which
  // account/date range this transaction belongs to
  cacheService.invalidate('transactions');
}
```

**Design Notes:**
- Follows the same pattern as `deletePayee`, `deleteCategory`, etc.
- Ensures API initialization before operation
- Invalidates cache after successful deletion
- Uses the API's deleteTransaction method which accepts `{ id }` object

### 2. Tool Schema Update (index.ts)

Extend the Zod schema to include 'delete' operation.

```typescript
// BEFORE
const ManageTransactionArgsSchema = z.object({
  operation: z.enum(['create', 'update']),
  id: z.string().optional(),
  transaction: z.object({
    account: z.string().optional(),
    date: z.string().optional(),
    amount: z.number().optional(),
    payee: z.string().optional(),
    category: z.string().optional(),
    notes: z.string().optional(),
    cleared: z.boolean().optional(),
  }),
});

// AFTER
const ManageTransactionArgsSchema = z.object({
  operation: z.enum(['create', 'update', 'delete']),
  id: z.string().optional(),
  transaction: z.object({
    account: z.string().optional(),
    date: z.string().optional(),
    amount: z.number().optional(),
    payee: z.string().optional(),
    category: z.string().optional(),
    notes: z.string().optional(),
    cleared: z.boolean().optional(),
  }).optional(), // Make transaction optional for delete
});

export const schema = {
  name: 'manage-transaction',
  description:
    'Create, update, or delete transactions. Accepts account, payee, and category names or IDs. ' +
    'For create: account and date are required. ' +
    'For update: id is required. ' +
    'For delete: only id is required. WARNING: Delete is permanent and cannot be undone.',
  inputSchema: zodToJsonSchema(ManageTransactionArgsSchema) as ToolInput,
};
```

**Design Notes:**
- Add 'delete' to operation enum
- Make `transaction` object optional (not needed for delete)
- Update description to include delete operation and warning
- Maintain backward compatibility with existing operations

### 3. Type Definitions (types.ts)

Update types to support delete operation.

```typescript
// Add to existing types
export interface ManageTransactionArgs {
  operation: 'create' | 'update' | 'delete';
  id?: string;
  transaction?: {
    account?: string;
    date?: string;
    amount?: number;
    payee?: string;
    category?: string;
    notes?: string;
    cleared?: boolean;
  };
}

export interface ParsedTransactionInput {
  operation: 'create' | 'update' | 'delete';
  id?: string;
  accountId?: string;
  date?: string;
  amount?: number;
  payeeId?: string;
  categoryId?: string;
  notes?: string;
  cleared?: boolean;
}

export interface TransactionOperationResult {
  transactionId: string;
  operation: 'create' | 'update' | 'delete';
  details?: {
    date?: string;
    amount?: number;
    payee?: string;
    account?: string;
  };
}
```

**Design Notes:**
- Add 'delete' to operation type unions
- Add optional `details` to result for delete confirmations
- Maintain existing structure for backward compatibility

### 4. Input Parser (input-parser.ts)

Extend parser to handle delete operation validation.

```typescript
export class ManageTransactionInputParser {
  async parse(args: ManageTransactionArgs): Promise<ParsedTransactionInput> {
    const { operation, id, transaction } = args;

    // Validate delete operation
    if (operation === 'delete') {
      if (!id) {
        throw validationError(
          'id',
          'Transaction ID is required for delete operation',
          'Example: "abc123-def456-ghi789"'
        );
      }

      return {
        operation: 'delete',
        id,
      };
    }

    // Existing validation for create and update
    // ... (no changes to existing code)
  }
}
```

**Design Notes:**
- Add early return for delete operation
- Only validate ID for delete (no need to resolve names)
- Use existing validation error builders
- Keep existing create/update logic unchanged

### 5. Data Fetcher (data-fetcher.ts)

Add delete method to data fetcher.

```typescript
export class ManageTransactionDataFetcher {
  async execute(input: ParsedTransactionInput): Promise<TransactionOperationResult> {
    if (input.operation === 'create') {
      return this.createTransaction(input);
    } else if (input.operation === 'update') {
      return this.updateTransaction(input);
    } else {
      return this.deleteTransaction(input);
    }
  }

  // Existing createTransaction and updateTransaction methods...

  /**
   * Delete an existing transaction.
   * Optionally fetches transaction details before deletion for confirmation message.
   *
   * @param input - Parsed transaction input with ID
   * @returns Result with deleted transaction ID and details
   */
  private async deleteTransaction(input: ParsedTransactionInput): Promise<TransactionOperationResult> {
    if (!input.id) {
      throw new Error('id is required for delete operation');
    }

    await initActualApi();

    // Optional: Fetch transaction details before deletion for better confirmation message
    let details: TransactionOperationResult['details'];
    try {
      // Try to get transaction details for confirmation
      // Note: This requires querying transactions, which may be expensive
      // Consider making this optional based on a flag
      const transactions = await actualApi.getTransactions(
        input.accountId || '', 
        '', 
        ''
      );
      const transaction = transactions.find(t => t.id === input.id);
      
      if (transaction) {
        details = {
          date: transaction.date,
          amount: transaction.amount,
          payee: transaction.payee_name || undefined,
          account: transaction.account,
        };
      }
    } catch (err) {
      // If we can't fetch details, proceed with deletion anyway
      console.error('Could not fetch transaction details before deletion:', err);
    }

    // Delete transaction via API wrapper
    await deleteTransaction(input.id);

    return {
      transactionId: input.id,
      operation: 'delete',
      details,
    };
  }
}
```

**Design Notes:**
- Add deleteTransaction method following existing patterns
- Optionally fetch transaction details before deletion for better UX
- Handle case where details can't be fetched (don't block deletion)
- Use the new API wrapper function
- Return result with details for confirmation message

**Alternative Simpler Approach** (if fetching details is too expensive):
```typescript
private async deleteTransaction(input: ParsedTransactionInput): Promise<TransactionOperationResult> {
  if (!input.id) {
    throw new Error('id is required for delete operation');
  }

  await initActualApi();
  
  // Delete transaction via API wrapper
  await deleteTransaction(input.id);

  return {
    transactionId: input.id,
    operation: 'delete',
  };
}
```

### 6. Report Generator (report-generator.ts)

Add delete confirmation message formatting.

```typescript
export class ManageTransactionReportGenerator {
  generate(input: ParsedTransactionInput, result: TransactionOperationResult): string {
    if (result.operation === 'create') {
      return this.formatCreateMessage(result);
    } else if (result.operation === 'update') {
      return this.formatUpdateMessage(result);
    } else {
      return this.formatDeleteMessage(result);
    }
  }

  // Existing formatCreateMessage and formatUpdateMessage methods...

  /**
   * Format delete confirmation message.
   * Includes transaction details if available.
   */
  private formatDeleteMessage(result: TransactionOperationResult): string {
    let message = `✓ Deleted transaction ${result.transactionId}`;

    if (result.details) {
      const parts: string[] = [];
      
      if (result.details.date) {
        parts.push(`Date: ${result.details.date}`);
      }
      if (result.details.amount !== undefined) {
        const formatted = formatAmount(result.details.amount);
        parts.push(`Amount: ${formatted}`);
      }
      if (result.details.payee) {
        parts.push(`Payee: ${result.details.payee}`);
      }
      if (result.details.account) {
        parts.push(`Account: ${result.details.account}`);
      }

      if (parts.length > 0) {
        message += '\n\nDeleted transaction details:\n' + parts.map(p => `• ${p}`).join('\n');
      }
    }

    message += '\n\n⚠️  This operation cannot be undone.';

    return message;
  }
}
```

**Design Notes:**
- Follow existing message format patterns
- Include transaction details if available
- Add warning about permanent deletion
- Use formatAmount utility for consistency
- Gracefully handle missing details

**Example Output:**
```
✓ Deleted transaction abc123-def456-ghi789

Deleted transaction details:
• Date: 2024-01-15
• Amount: -$45.99
• Payee: Amazon
• Account: Checking

⚠️  This operation cannot be undone.
```

## Data Models

### Updated ManageTransactionArgs

```typescript
interface ManageTransactionArgs {
  operation: 'create' | 'update' | 'delete';
  id?: string;                    // Required for update and delete
  transaction?: {                 // Required for create and update, optional for delete
    account?: string;
    date?: string;
    amount?: number;
    payee?: string;
    category?: string;
    notes?: string;
    cleared?: boolean;
  };
}
```

### Updated TransactionOperationResult

```typescript
interface TransactionOperationResult {
  transactionId: string;
  operation: 'create' | 'update' | 'delete';
  details?: {                     // NEW: Optional details for delete confirmation
    date?: string;
    amount?: number;
    payee?: string;
    account?: string;
  };
}
```

## Error Handling

### Validation Errors

```typescript
// Missing ID for delete
if (operation === 'delete' && !id) {
  throw validationError(
    'id',
    'Transaction ID is required for delete operation',
    'Example: "abc123-def456-ghi789"'
  );
}
```

### API Errors

```typescript
// Transaction not found
try {
  await deleteTransaction(id);
} catch (err) {
  if (err.message.includes('not found')) {
    throw notFoundError(
      'transaction',
      id,
      { message: 'Transaction may have already been deleted or does not exist' }
    );
  }
  throw err;
}
```

### Edge Case Handling

```typescript
// Transfer transactions
// Note: The Actual Budget API handles transfer deletion automatically
// Both sides of the transfer are deleted when either is deleted

// Subtransactions
// Note: The API automatically deletes subtransactions when parent is deleted

// Reconciled transactions
// Note: The API allows deletion regardless of reconciliation status
```

## Testing Strategy

### Unit Tests

1. **API Wrapper (actual-api.test.ts)**
   ```typescript
   describe('deleteTransaction', () => {
     it('should call API deleteTransaction with transaction ID', async () => {
       await actualApi.deleteTransaction('txn-123');
       expect(api.deleteTransaction).toHaveBeenCalledWith({ id: 'txn-123' });
     });

     it('should invalidate transaction cache after deletion', async () => {
       await actualApi.deleteTransaction('txn-123');
       expect(cacheService.invalidate).toHaveBeenCalledWith('transactions');
     });

     it('should ensure API is initialized before deletion', async () => {
       await actualApi.deleteTransaction('txn-123');
       expect(initActualApi).toHaveBeenCalled();
     });
   });
   ```

2. **Input Parser (input-parser.test.ts)**
   ```typescript
   describe('ManageTransactionInputParser - delete', () => {
     it('should parse delete operation with ID', async () => {
       const result = await parser.parse({
         operation: 'delete',
         id: 'txn-123',
       });
       expect(result).toEqual({
         operation: 'delete',
         id: 'txn-123',
       });
     });

     it('should throw error if ID is missing for delete', async () => {
       await expect(parser.parse({
         operation: 'delete',
       })).rejects.toThrow('Transaction ID is required');
     });
   });
   ```

3. **Data Fetcher (data-fetcher.test.ts)**
   ```typescript
   describe('ManageTransactionDataFetcher - delete', () => {
     it('should delete transaction and return result', async () => {
       const result = await fetcher.execute({
         operation: 'delete',
         id: 'txn-123',
       });
       expect(result).toEqual({
         transactionId: 'txn-123',
         operation: 'delete',
       });
       expect(deleteTransaction).toHaveBeenCalledWith('txn-123');
     });
   });
   ```

4. **Report Generator (report-generator.test.ts)**
   ```typescript
   describe('ManageTransactionReportGenerator - delete', () => {
     it('should format delete message with details', () => {
       const message = generator.generate(
         { operation: 'delete', id: 'txn-123' },
         {
           transactionId: 'txn-123',
           operation: 'delete',
           details: {
             date: '2024-01-15',
             amount: -4599,
             payee: 'Amazon',
           },
         }
       );
       expect(message).toContain('✓ Deleted transaction txn-123');
       expect(message).toContain('Date: 2024-01-15');
       expect(message).toContain('Amount: -$45.99');
       expect(message).toContain('⚠️  This operation cannot be undone');
     });
   });
   ```

### Integration Tests

```typescript
describe('manage-transaction tool - delete operation', () => {
  it('should delete transaction end-to-end', async () => {
    // Setup: Create a transaction
    const createResult = await handler({
      operation: 'create',
      transaction: {
        account: 'Checking',
        date: '2024-01-15',
        amount: -45.99,
        payee: 'Amazon',
      },
    });
    const transactionId = extractIdFromResponse(createResult);

    // Execute: Delete the transaction
    const deleteResult = await handler({
      operation: 'delete',
      id: transactionId,
    });

    // Verify: Deletion succeeded
    expect(deleteResult.content[0].text).toContain('✓ Deleted transaction');
    
    // Verify: Transaction no longer exists
    const transactions = await getTransactions('checking-id', '2024-01-01', '2024-12-31');
    expect(transactions.find(t => t.id === transactionId)).toBeUndefined();
  });

  it('should handle deletion of non-existent transaction', async () => {
    const result = await handler({
      operation: 'delete',
      id: 'non-existent-id',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});
```

## Migration Strategy

### Phase 1: API Wrapper (Day 1)
1. Add `deleteTransaction` function to `actual-api.ts`
2. Add unit tests for API wrapper
3. Verify cache invalidation works

### Phase 2: Tool Extension (Day 1-2)
1. Update types to include 'delete' operation
2. Update schema to include 'delete' in enum
3. Extend input parser for delete validation
4. Add delete method to data fetcher
5. Add delete formatting to report generator

### Phase 3: Testing (Day 2)
1. Write unit tests for all components
2. Write integration tests
3. Manual testing with various scenarios

### Phase 4: Documentation (Day 2)
1. Update tool schema description
2. Add examples to README
3. Document edge cases and limitations

### Rollback Plan
- Changes are additive only
- Can remove 'delete' from enum to disable
- No breaking changes to existing operations
- Can revert individual commits if needed

## Performance Considerations

### Transaction Detail Fetching

**Option 1: Fetch details before deletion**
- Pro: Better user feedback with transaction details
- Con: Requires additional query (may be slow)
- Con: Need to know account ID or query all accounts

**Option 2: Skip detail fetching**
- Pro: Faster deletion (single API call)
- Pro: Simpler implementation
- Con: Less informative confirmation message

**Recommendation**: Start with Option 2 (simpler), add Option 1 later if users request it.

### Cache Invalidation

Current approach invalidates all transaction cache:
```typescript
cacheService.invalidate('transactions');
```

**Future Enhancement**: Use granular cache keys (from tool-quality-improvements spec):
```typescript
// If we know the account and date range
cacheService.invalidate(`transactions:${accountId}:*`);
```

## Security Considerations

### Authorization
- Delete operation requires write permissions (already enforced by tool registry)
- No additional authorization needed beyond existing write permission check

### Audit Trail
- All deletions logged via existing performance logger
- Transaction ID included in logs
- Consider adding user/client identifier to logs (future enhancement)

### Data Validation
- Validate transaction ID format (UUID)
- Prevent SQL injection (handled by API layer)
- No sensitive data in error messages

## Edge Cases

### Transfer Transactions
- **Behavior**: Actual Budget API deletes both sides of transfer automatically
- **Handling**: No special handling needed, API manages this
- **User Feedback**: Could add note in confirmation if transfer detected (future enhancement)

### Subtransactions
- **Behavior**: API deletes subtransactions when parent is deleted
- **Handling**: No special handling needed
- **User Feedback**: Could add count of subtransactions deleted (future enhancement)

### Reconciled Transactions
- **Behavior**: API allows deletion regardless of reconciliation status
- **Handling**: No special handling needed
- **User Feedback**: Could warn if transaction is reconciled (future enhancement)

### Scheduled Transactions
- **Behavior**: Deleting an instance doesn't affect the schedule
- **Handling**: No special handling needed
- **User Feedback**: Clear in confirmation that only instance is deleted

## Documentation Updates

### Tool Schema
```typescript
description:
  'Create, update, or delete transactions. Accepts account, payee, and category names or IDs. ' +
  'For create: account and date are required. ' +
  'For update: id is required. ' +
  'For delete: only id is required. WARNING: Delete is permanent and cannot be undone.'
```

### README.md
Add example:
```markdown
### Delete a Transaction

```json
{
  "operation": "delete",
  "id": "abc123-def456-ghi789"
}
```

**Warning**: Transaction deletion is permanent and cannot be undone.
```

### CHANGELOG.md
```markdown
## [Unreleased]

### Added
- Transaction deletion support via `manage-transaction` tool with `operation: 'delete'`
- `deleteTransaction` API wrapper function in `actual-api.ts`
```

## Success Criteria

### Functional
- ✅ Can delete transactions via manage-transaction tool
- ✅ Deletion requires only transaction ID
- ✅ Clear confirmation message returned
- ✅ Cache invalidated after deletion
- ✅ Error handling for non-existent transactions

### Non-Functional
- ✅ No breaking changes to existing operations
- ✅ Follows existing code patterns
- ✅ Unit test coverage >90%
- ✅ Integration tests pass
- ✅ Performance impact <10ms overhead

### User Experience
- ✅ Clear warning about permanent deletion
- ✅ Confirmation includes transaction ID
- ✅ Error messages are actionable
- ✅ Consistent with other delete operations

## Future Enhancements

### Beyond This Spec
1. **Batch Deletion**: Delete multiple transactions in one call
2. **Soft Delete**: Mark as deleted without removing (if API supports)
3. **Undo Support**: Store deleted transaction for potential restoration
4. **Enhanced Confirmations**: Include transfer/subtransaction warnings
5. **Granular Cache Invalidation**: Only invalidate affected cache entries
