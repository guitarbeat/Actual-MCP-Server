// Handles entity creation and transaction insertion for create-transaction tool

import {
  getAccounts,
  getPayees,
  getCategories,
  getCategoryGroups,
  createPayee,
  createCategory,
  importTransactions,
} from '../../actual-api.js';
import type { CreateTransactionInput, EntityCreationResult } from './types.js';

export class CreateTransactionDataFetcher {
  /**
   * Ensures payee exists, creating it if necessary
   */
  async ensurePayeeExists(payeeName?: string): Promise<{ payeeId?: string; created: boolean }> {
    if (!payeeName) {
      return { created: false };
    }

    const payees = await getPayees();
    const existingPayee = payees.find((p) => p.name.toLowerCase() === payeeName.toLowerCase());

    if (existingPayee) {
      return { payeeId: existingPayee.id, created: false };
    }

    // Crear nuevo payee usando objeto
    const payeeId = await createPayee({ name: payeeName });
    return { payeeId, created: true };
  }

  /**
   * Ensures category exists, creating it if necessary
   */
  async ensureCategoryExists(
    categoryName?: string,
    categoryGroupName?: string
  ): Promise<{ categoryId?: string; created: boolean }> {
    if (!categoryName && !categoryGroupName) {
      return { created: false };
    }

    const categories = await getCategories();
    const categoryGroups = await getCategoryGroups();

    // Si se proporciona categoryName, buscar categoría existente
    if (categoryName) {
      const existingCategory = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
      if (existingCategory) {
        return { categoryId: existingCategory.id, created: false };
      }

      // Si no existe, buscar grupo adecuado
      const defaultGroup = categoryGroups.find((g) => !g.is_income) || categoryGroups[0];
      if (!defaultGroup) {
        throw new Error('No category groups available to create category');
      }

      const categoryId = await createCategory({ name: categoryName, group: defaultGroup.id });
      return { categoryId, created: true };
    }

    // Si se proporciona categoryGroupName, crear categoría con ese nombre en el grupo
    if (categoryGroupName) {
      const categoryId = await this.createCategoryInGroup(categoryGroupName, categoryGroups);
      return { categoryId, created: true };
    }

    return { created: false };
  }

  private async createCategoryInGroup(
    categoryGroupName: string,
    categoryGroups: Array<{ id: string; name: string; is_income?: boolean }>
  ): Promise<string> {
    // Buscar grupo existente o usar el primero que no sea de ingresos
    let targetGroup = categoryGroups.find((g) => g.name.toLowerCase() === categoryGroupName.toLowerCase());

    if (!targetGroup) {
      targetGroup = categoryGroups.find((g) => !g.is_income) || categoryGroups[0];
      if (!targetGroup) {
        throw new Error('No suitable category group found');
      }
    }

    // Crear categoría usando objeto
    return await createCategory({ name: categoryGroupName, group: targetGroup.id });
  }

  /**
   * Validates account exists
   */
  async validateAccount(accountId: string): Promise<void> {
    const accounts = await getAccounts();
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }

    if (account.closed) {
      throw new Error(`Account ${account.name} is closed`);
    }
  }

  /**
   * Creates the transaction using importTransactions for better duplicate detection and rule execution
   */
  async createTransaction(input: CreateTransactionInput): Promise<EntityCreationResult & { 
    transactionIds: string[];
    wasAdded: boolean;
    wasUpdated: boolean;
    errors?: string[];
  }> {
    // Validate account exists
    await this.validateAccount(input.accountId);

    // Ensure payee exists (or use payee_name for automatic creation by importTransactions)
    const { payeeId, created: createdPayee } = await this.ensurePayeeExists(input.payee);

    // Ensure category exists
    const { categoryId, created: createdCategory } = await this.ensureCategoryExists(
      input.category,
      input.categoryGroup
    );

    // Convert amount to cents (Actual uses integer cents)
    const amountInCents = Math.round(input.amount * 100);

    // Prepare transaction object for importTransactions
    // * Use payee_name instead of payee_id if payee was provided as a name, allowing API to create it
    // * This enables better automatic handling, but we still create it first to ensure consistency
    const transaction = {
      date: input.date,
      amount: amountInCents,
      payee: payeeId || null,
      // Also include payee_name if we have a payee name but no ID (for automatic creation)
      payee_name: input.payee && !payeeId ? input.payee : undefined,
      category: categoryId || null,
      notes: input.notes || '',
      cleared: input.cleared !== undefined ? input.cleared : true,
      // Generate a unique imported_id to help with duplicate detection if needed
      // Using date + amount + accountId as a simple fingerprint
      imported_id: `manual-${input.accountId}-${input.date}-${amountInCents}-${Date.now()}`,
    };

    // Import the transaction (this will run rules, detect duplicates, etc.)
    const importResult = await importTransactions(input.accountId, [transaction]);

    // Determine if transaction was added or updated
    const wasAdded = importResult.added.length > 0;
    const wasUpdated = importResult.updated.length > 0;
    const transactionIds = [...importResult.added, ...importResult.updated];

    return {
      transactionIds,
      wasAdded,
      wasUpdated,
      errors: importResult.errors,
      payeeId,
      categoryId,
      createdPayee,
      createdCategory,
    };
  }
}
