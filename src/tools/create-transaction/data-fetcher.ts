// Handles entity creation and transaction insertion for create-transaction tool

import {
  getAccounts,
  getPayees,
  getCategories,
  getCategoryGroups,
  createPayee,
  createCategory,
  addTransactions,
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
   * Creates the transaction after ensuring all entities exist
   */
  async createTransaction(input: CreateTransactionInput): Promise<EntityCreationResult & { transactionId: string }> {
    // Validate account exists
    await this.validateAccount(input.accountId);

    // Ensure payee exists
    const { payeeId, created: createdPayee } = await this.ensurePayeeExists(input.payee);

    // Ensure category exists
    const { categoryId, created: createdCategory } = await this.ensureCategoryExists(
      input.category,
      input.categoryGroup
    );

    // Convert amount to cents (Actual uses integer cents)
    const amountInCents = Math.round(input.amount * 100);

    // Prepare transaction object
    const transaction = {
      date: input.date,
      amount: amountInCents,
      payee: payeeId || null,
      category: categoryId || null,
      notes: input.notes || '',
      cleared: input.cleared || true,
    };

    // Add the transaction
    await addTransactions(input.accountId, [transaction], { learnCategories: true });

    return {
      transactionId: 'created', // The API doesn't return the created transaction ID directly
      payeeId,
      categoryId,
      createdPayee,
      createdCategory,
    };
  }
}
