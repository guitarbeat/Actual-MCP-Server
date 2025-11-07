import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { setupResources, RESOURCE_TEMPLATES } from './resources.js';
import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

vi.mock('./actual-api.js', () => ({
  initActualApi: vi.fn(),
  getBudgetMonths: vi.fn(),
  getBudgetMonth: vi.fn(),
}));

vi.mock('./core/data/fetch-accounts.js', () => ({
  fetchAllAccounts: vi.fn(),
}));

const { initActualApi, getBudgetMonths, getBudgetMonth } = await import('./actual-api.js');
const { fetchAllAccounts } = await import('./core/data/fetch-accounts.js');

type RequestHandler = (request: unknown, extra?: unknown) => Promise<unknown>;

const getRequestHandler = (
  server: Server,
  schema:
    | typeof ListResourcesRequestSchema
    | typeof ListResourceTemplatesRequestSchema
    | typeof ReadResourceRequestSchema
): RequestHandler => {
  const handlers = (server as unknown as { _requestHandlers: Map<string, RequestHandler> })._requestHandlers;
  const handler = handlers.get(schema.shape.method.value);
  if (!handler) {
    throw new Error(`Handler not registered for ${schema.shape.method.value}`);
  }
  return handler;
};

describe('setupResources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes resource templates for clients', async () => {
    const server = new Server({ name: 'test', version: '0.0.0' }, { capabilities: { resources: {} } });
    setupResources(server);

    const handler = getRequestHandler(server, ListResourceTemplatesRequestSchema);
    const result = (await handler({ method: 'resources/templates/list', params: {} })) as {
      resourceTemplates: typeof RESOURCE_TEMPLATES;
    };

    expect(result.resourceTemplates).toEqual(RESOURCE_TEMPLATES);
    const uriTemplates = result.resourceTemplates.map((template) => template.uriTemplate);
    expect(uriTemplates).toContain('actual://accounts');
    expect(uriTemplates).toContain('actual://accounts/{accountId}');
    expect(uriTemplates).toContain('actual://accounts/{accountId}/transactions');
    expect(uriTemplates).toContain('actual://budgets');
    expect(uriTemplates).toContain('actual://budgets/{month}');
  });

  it('lists accounts and budget resources', async () => {
    const server = new Server({ name: 'test', version: '0.0.0' }, { capabilities: { resources: {} } });
    setupResources(server);

    const sampleAccount = {
      id: 'acc-1',
      name: 'Checking',
      type: 'checking',
      closed: false,
      offbudget: false,
      balance: 123_00,
    } as const;

    // Use current date to generate relevant months (3 back, current, 2 forward)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const relevantMonths: string[] = [];
    for (let i = -3; i <= 2; i++) {
      let year = currentYear;
      let month = currentMonth + i;
      if (month < 1) {
        month += 12;
        year -= 1;
      } else if (month > 12) {
        month -= 12;
        year += 1;
      }
      relevantMonths.push(`${year}-${String(month).padStart(2, '0')}`);
    }

    // Include some months outside the range to test filtering
    const allMonths = [
      `${currentYear - 1}-12`, // Old month
      ...relevantMonths,
      `${currentYear + 1}-06`, // Future month beyond range
    ];

    vi.mocked(fetchAllAccounts).mockResolvedValue([sampleAccount]);
    vi.mocked(getBudgetMonths).mockResolvedValue(allMonths);

    const handler = getRequestHandler(server, ListResourcesRequestSchema);
    const result = (await handler({ method: 'resources/list', params: {} })) as {
      resources: Array<{ uri: string; name: string; description?: string }>;
    };

    expect(initActualApi).toHaveBeenCalledTimes(1);
    expect(fetchAllAccounts).toHaveBeenCalledTimes(1);
    expect(getBudgetMonths).toHaveBeenCalledTimes(1);

    // Should have: accounts overview + 1 account + budgets overview + 6 relevant months = 9 resources
    expect(result.resources.length).toBe(9);
    expect(result.resources[0].uri).toBe('actual://accounts');
    expect(result.resources[0].name).toBe('Accounts Overview');
    expect(result.resources[1].uri).toBe(`actual://accounts/${sampleAccount.id}`);
    expect(result.resources[1].name).toBe(sampleAccount.name);
    expect(result.resources[2].uri).toBe('actual://budgets');
    expect(result.resources[2].name).toBe('Budget Months');
    // Check that only relevant months are included
    const budgetResources = result.resources.slice(3);
    expect(budgetResources.length).toBe(6);
    budgetResources.forEach((resource, index) => {
      expect(resource.uri).toBe(`actual://budgets/${relevantMonths[index]}`);
      expect(resource.name).toBe(`Budget ${relevantMonths[index]}`);
    });
  });

  describe('budget resources', () => {
    it('returns list of relevant budget months for actual://budgets', async () => {
      const server = new Server({ name: 'test', version: '0.0.0' }, { capabilities: { resources: {} } });
      setupResources(server);

      // Use current date to generate relevant months (3 back, current, 2 forward)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const relevantMonths: string[] = [];
      for (let i = -3; i <= 2; i++) {
        let year = currentYear;
        let month = currentMonth + i;
        if (month < 1) {
          month += 12;
          year -= 1;
        } else if (month > 12) {
          month -= 12;
          year += 1;
        }
        relevantMonths.push(`${year}-${String(month).padStart(2, '0')}`);
      }

      // Include some months outside the range to test filtering
      const allMonths = [
        `${currentYear - 1}-12`, // Old month
        ...relevantMonths,
        `${currentYear + 1}-06`, // Future month beyond range
      ];

      vi.mocked(getBudgetMonths).mockResolvedValue(allMonths);

      const handler = getRequestHandler(server, ReadResourceRequestSchema);
      const result = (await handler({
        method: 'resources/read',
        params: { uri: 'actual://budgets' },
      })) as {
        contents: Array<{ uri: string; text: string; mimeType: string }>;
      };

      expect(getBudgetMonths).toHaveBeenCalledTimes(1);
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('# Actual Budget Months');
      expect(result.contents[0].text).toContain(
        'Showing relevant months (3 months back, current month, 2 months forward)'
      );
      // Check that only relevant months are included
      relevantMonths.forEach((month) => {
        expect(result.contents[0].text).toContain(`- ${month}`);
      });
      // Check that old and future months are not included
      expect(result.contents[0].text).not.toContain(`${currentYear - 1}-12`);
      expect(result.contents[0].text).not.toContain(`${currentYear + 1}-06`);
      expect(result.contents[0].text).toContain(`Total Months: ${relevantMonths.length}`);
    });

    it('returns formatted budget for specific month', async () => {
      const server = new Server({ name: 'test', version: '0.0.0' }, { capabilities: { resources: {} } });
      setupResources(server);

      const mockBudgetData = {
        month: '2024-01',
        totalIncome: 500000,
        totalBudgeted: -300000,
        totalSpent: -250000,
        totalBalance: -50000,
        toBudget: 200000,
        categoryGroups: [
          {
            id: 'group-1',
            name: 'FOOD',
            is_income: false,
            budgeted: -50000,
            spent: -45000,
            balance: -5000,
            categories: [
              {
                id: 'cat-1',
                name: 'Groceries',
                budgeted: 50000,
                spent: -45000,
                balance: 5000,
                carryover: false,
              },
            ],
          },
        ],
      };

      vi.mocked(getBudgetMonth).mockResolvedValue(mockBudgetData);

      const handler = getRequestHandler(server, ReadResourceRequestSchema);
      const result = (await handler({
        method: 'resources/read',
        params: { uri: 'actual://budgets/2024-01' },
      })) as {
        contents: Array<{ uri: string; text: string; mimeType: string }>;
      };

      expect(getBudgetMonth).toHaveBeenCalledWith('2024-01');
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('# Budget: 2024-01');
      expect(result.contents[0].text).toContain('## Summary');
      expect(result.contents[0].text).toContain('Total Income');
      expect(result.contents[0].text).toContain('## Category Groups');
      expect(result.contents[0].text).toContain('### FOOD');
      expect(result.contents[0].text).toContain('Groceries');
    });

    it('returns error for invalid month format', async () => {
      const server = new Server({ name: 'test', version: '0.0.0' }, { capabilities: { resources: {} } });
      setupResources(server);

      const handler = getRequestHandler(server, ReadResourceRequestSchema);
      const result = (await handler({
        method: 'resources/read',
        params: { uri: 'actual://budgets/invalid' },
      })) as {
        contents: Array<{ uri: string; text: string; mimeType: string }>;
      };

      expect(result.contents[0].mimeType).toBe('text/plain');
      expect(result.contents[0].text).toContain('Invalid month format');
      expect(getBudgetMonth).not.toHaveBeenCalled();
    });

    it('returns error for non-existent month', async () => {
      const server = new Server({ name: 'test', version: '0.0.0' }, { capabilities: { resources: {} } });
      setupResources(server);

      vi.mocked(getBudgetMonth).mockRejectedValue(new Error('Month not found'));

      const handler = getRequestHandler(server, ReadResourceRequestSchema);
      const result = (await handler({
        method: 'resources/read',
        params: { uri: 'actual://budgets/2024-13' },
      })) as {
        contents: Array<{ uri: string; text: string; mimeType: string }>;
      };

      expect(result.contents[0].mimeType).toBe('text/plain');
      expect(result.contents[0].text).toContain('Error: Budget data for month 2024-13');
    });
  });
});
