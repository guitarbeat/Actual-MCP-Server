import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stringify as stringifyCsv } from 'csv-stringify/sync';
import { strToU8, zipSync } from 'fflate';
import type {
  APICategoryEntity,
  APICategoryGroupEntity,
} from '@actual-app/api/@types/loot-core/src/server/api-models.js';
import type { Account, Transaction } from '../types/domain.js';
import {
  applyAmazonAudit,
  allocateCategorySplitCents,
  type AmazonAuditFile,
  type AmazonExportData,
  buildAmazonAudit,
  inferPaymentMethodMappings,
  loadAmazonExportDataFromZip,
} from './amazon-purchase-audit.js';
import {
  createCategory,
  getCategories,
  getCategoryGroups,
  updateTransaction,
} from '../api/actual-client.js';
import { fetchAllAccounts } from '../data/fetch-accounts.js';
import {
  fetchAllOnBudgetTransactionsWithMetadata,
  type TransactionFetchResult,
} from '../data/fetch-transactions.js';

vi.mock('../api/actual-client.js', () => ({
  createCategory: vi.fn(),
  getCategories: vi.fn(),
  getCategoryGroups: vi.fn(),
  updateTransaction: vi.fn(),
}));

vi.mock('../data/fetch-accounts.js', () => ({
  fetchAllAccounts: vi.fn(),
}));

vi.mock('../data/fetch-transactions.js', () => ({
  fetchAllOnBudgetTransactionsWithMetadata: vi.fn(),
}));

const accounts: Account[] = [
  { id: 'amazon-prime', name: '💳 Amazon Prime', offbudget: false, closed: false },
  { id: 'bilt', name: '💳 Bilt Rewards', offbudget: false, closed: false },
];

type AmazonChargeEvent =
  Parameters<typeof inferPaymentMethodMappings>[0] extends Map<string, infer T> ? T : never;
type AmazonAuditInput = Parameters<typeof buildAmazonAudit>[0];
type AmazonOrderHistoryRow = AmazonExportData['orderHistoryRows'][number];
type AmazonRefundDetailsRow = AmazonExportData['refundDetailsRows'][number];
type AmazonDigitalOrderRow = AmazonExportData['digitalOrderRows'][number];

function buildAmazonExportData(overrides: Partial<AmazonExportData> = {}): AmazonExportData {
  return {
    orderHistoryRows: [],
    refundDetailsRows: [],
    digitalOrderRows: [],
    ...overrides,
  };
}

function buildAmazonAuditInput(overrides: Partial<AmazonAuditInput>): AmazonAuditInput {
  return {
    accounts,
    transactions: [],
    exportData: buildAmazonExportData(),
    budgetStartDate: '2023-12-13',
    paymentMethodOverrides: {},
    categoryOverrides: {},
    ...overrides,
  };
}

function buildTransactionFetchResult(transactions: Transaction[]): TransactionFetchResult {
  return {
    transactions,
    successfulAccountIds: accounts.map((account) => account.id),
    warnings: [],
  };
}

function buildCategories(categories: APICategoryEntity[]): APICategoryEntity[] {
  return categories;
}

function buildCategoryGroups(groups: APICategoryGroupEntity[]): APICategoryGroupEntity[] {
  return groups;
}

function buildOrderHistoryCsv(rows: AmazonOrderHistoryRow[]): string {
  return stringifyCsv(rows, { header: true });
}

function buildOrderRow(overrides: Partial<AmazonOrderHistoryRow>): AmazonOrderHistoryRow {
  return {
    ASIN: 'ASIN-1',
    'Billing Address': '',
    'Carrier Name & Tracking Number': '',
    Currency: 'USD',
    'Gift Message': '',
    'Gift Recipient Contact': '',
    'Gift Sender Name': '',
    'Item Serial Number': '',
    'Order Date': '2024-01-15',
    'Order ID': 'ORDER-1',
    'Order Status': 'Shipped',
    'Original Quantity': '1',
    'Payment Method Type': 'Visa - 2143',
    'Product Condition': 'New',
    'Product Name': 'USB-C Cable',
    'Purchase Order Number': '',
    'Ship Date': '2024-01-15',
    'Shipment Item Subtotal': '15.00',
    'Shipment Item Subtotal Tax': '0.00',
    'Shipment Status': 'Delivered',
    'Shipping Address': '',
    'Shipping Charge': '0.00',
    'Shipping Option': 'Standard',
    'Total Amount': '15.00',
    'Total Discounts': '0.00',
    'Unit Price': '15.00',
    'Unit Price Tax': '0.00',
    Website: 'Amazon.com',
    ...overrides,
  };
}

function buildRefundRow(overrides: Partial<AmazonRefundDetailsRow>): AmazonRefundDetailsRow {
  return {
    'Creation Date': '2024-01-17',
    Currency: 'USD',
    'Direct Debit Refund Amount': '0.00',
    'Disbursement Type': 'Credit',
    'Order ID': 'ORDER-1',
    'Payment Status': 'Completed',
    Quantity: '1',
    'Refund Amount': '15.00',
    'Refund Date': '2024-01-17',
    'Reversal Amount State': '',
    'Reversal Reason': 'Return',
    'Reversal Status': '',
    Website: 'Amazon.com',
    ...overrides,
  };
}

function buildDigitalRow(overrides: Partial<AmazonDigitalOrderRow>): AmazonDigitalOrderRow {
  return {
    ASIN: 'DIGITAL-1',
    'Affected Item Quantity': '1',
    'Alternative Order Providing Payment': '',
    'Base Currency': 'USD',
    'Base Currency Code': 'USD',
    'Billing Address': '',
    'Claim Code': '',
    'Component Type': 'DigitalProduct',
    'Country Code': 'US',
    'Customer Declared Address': '',
    'Declared Country Code': 'US',
    'Delivery Date': '2024-03-01',
    'Delivery Packet ID': '',
    'Delivery Status': 'Delivered',
    'Digital Order Item Attributes': '',
    'Digital Order Item ID': 'DIGITAL-ITEM-1',
    'Does Order Depend On Another Order': 'No',
    'FX Currency Code': 'USD',
    'FX Transaction Amount': '9.99',
    'Fulfilled Date': '2024-03-01',
    'Fulfillment Mobile Number': '',
    'Fullfilment Status': 'Delivered',
    'Gift Claim Date': '',
    'Gift Customer Nickname': '',
    'Gift Email': '',
    'Gift Item': 'No',
    'Gift Message': '',
    'Gift Redemption': '',
    'Installment Our Price': '',
    'Installment Our Price Plus Tax': '',
    'Installment Price Currency Code': 'USD',
    'Installment Price Plus Tax Currency Code': 'USD',
    'Is Order A Preorder': 'No',
    'Is Order Eligible For Prime Benefit': 'Yes',
    'Is Order Free Replacement': 'No',
    'Item Fulfilled': 'Yes',
    'Item Merged From Another Order': 'No',
    'List Price Amount': '9.99',
    'List Price Currency Code': 'USD',
    'List Price Tax Amount': '0.00',
    'List Price Tax Currency Code': 'USD',
    Marketplace: 'Amazon.com',
    'Multifactor Authentication Status (depreciated)': '',
    'Offer Type Code': '',
    'Offering SKU': '',
    'Order Date': '2024-03-01',
    'Order ID': 'DIGITAL-ORDER-1',
    'Order Status': 'Completed',
    'Ordering Customer Nickname': '',
    'Original Quantity': '1',
    'Paid By Other Customer': 'No',
    'Payment Information': 'Visa - 2143',
    'Previously Paid Digital Order Item ID': '',
    PreviouslyPaidOrderId: '',
    Price: '9.99',
    'Price Currency Code': 'USD',
    'Price Tax': '0.00',
    'Price Tax Currency Code': 'USD',
    'Product Name': 'Prime Membership Fee',
    Publisher: 'Amazon',
    'Quantity Ordered': '1',
    'Recharge Amount': '0.00',
    'Recharge Amount Currency Code': 'USD',
    'Recipient Email': '',
    'Related Physical Order ID': '',
    'Seller Of Record': 'Amazon',
    'Session ID': '',
    'Ship From': '',
    'Ship To': '',
    'Shipping Address': '',
    'Shopping Marketplace ID': '',
    'Subscription Order Info List': '',
    'Subscription Order Type': '',
    'Third Party Display Currency Code': 'USD',
    'Third Party Display Price': '9.99',
    'Transaction Amount': '9.99',
    'Unique Browser ID': '',
    ...overrides,
  };
}

describe('amazon-purchase-audit', () => {
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    tempDir = await mkdtemp(join(tmpdir(), 'amazon-audit-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('reads the nested zip paths and filters rows before the budget start date', async () => {
    const zipPath = join(tempDir, 'Your Orders.zip');
    const zipEntries = {
      'Your Amazon Orders/Order History.csv': strToU8(
        buildOrderHistoryCsv([
          buildOrderRow({
            'Order ID': 'BEFORE',
            'Order Date': '2023-11-01',
            'Ship Date': '2023-11-02',
          }),
          buildOrderRow({
            'Order ID': 'AFTER',
            'Order Date': '2023-12-20',
            'Ship Date': '2023-12-21',
          }),
        ]),
      ),
      'Your Returns & Refunds/Refund Details.csv': strToU8(
        stringifyCsv(
          [
            buildRefundRow({ 'Order ID': 'BEFORE', 'Refund Date': '2023-11-10' }),
            buildRefundRow({ 'Order ID': 'AFTER', 'Refund Date': '2023-12-22' }),
          ],
          { header: true },
        ),
      ),
      'Your Amazon Orders/Digital Content Orders.csv': strToU8(
        stringifyCsv(
          [
            buildDigitalRow({
              'Order ID': 'BEFORE',
              'Fulfilled Date': '2023-11-09',
              'Order Date': '2023-11-09',
            }),
            buildDigitalRow({
              'Order ID': 'AFTER',
              'Fulfilled Date': '2023-12-25',
              'Order Date': '2023-12-25',
            }),
          ],
          { header: true },
        ),
      ),
    };

    await writeFile(zipPath, Buffer.from(zipSync(zipEntries)));

    const result = await loadAmazonExportDataFromZip(zipPath, '2023-12-13');

    expect(result.orderHistoryRows).toHaveLength(1);
    expect(result.orderHistoryRows[0]?.['Order ID']).toBe('AFTER');
    expect(result.refundDetailsRows).toHaveLength(1);
    expect(result.refundDetailsRows[0]?.['Order ID']).toBe('AFTER');
    expect(result.digitalOrderRows).toHaveLength(1);
    expect(result.digitalOrderRows[0]?.['Order ID']).toBe('AFTER');
  });

  it('infers payment methods from unique matches while honoring seeds and overrides', () => {
    const resolvedPairs = new Map<string, AmazonChargeEvent>([
      [
        'txn-1',
        {
          id: 'event-1',
          kind: 'physical-charge',
          orderId: 'ORDER-1',
          eventDate: '2024-01-15',
          amountCents: 1500,
          paymentMethodType: 'Visa - 9999',
          items: [],
        },
      ],
    ]);
    const transactionsById = new Map<string, Transaction>([
      [
        'txn-1',
        {
          id: 'txn-1',
          account: 'amazon-prime',
          account_name: '💳 Amazon Prime',
          date: '2024-01-15',
          amount: -1500,
        },
      ],
    ]);

    const result = inferPaymentMethodMappings(resolvedPairs, transactionsById, accounts, {
      paymentMethods: {
        'MasterCard - 7264': 'bilt',
        'Unknown Card': 'missing-account',
      },
    });

    expect(result.mappings['Visa - 2143']).toEqual({
      accountName: '💳 Amazon Prime',
      source: 'seed',
    });
    expect(result.mappings['Visa - 9999']).toEqual({
      accountName: '💳 Amazon Prime',
      source: 'derived',
    });
    expect(result.mappings['MasterCard - 7264']).toEqual({
      accountName: '💳 Bilt Rewards',
      source: 'override',
    });
    expect(result.warnings).toEqual([
      'Payment override for "Unknown Card" references unknown account "missing-account".',
    ]);
  });

  it('builds exact-only category recommendations and uses split updates for mixed orders', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-tech',
        account: 'amazon-prime',
        account_name: '💳 Amazon Prime',
        date: '2024-01-15',
        amount: -1500,
        payee_name: 'Amazon',
        category_name: '📦 Amazon Orders',
      },
      {
        id: 'tx-split',
        account: 'bilt',
        account_name: '💳 Bilt Rewards',
        date: '2024-02-15',
        amount: -3000,
        payee_name: 'Amazon',
        category_name: '📦 Amazon Orders',
      },
      {
        id: 'tx-prime',
        account: 'amazon-prime',
        account_name: '💳 Amazon Prime',
        date: '2024-03-01',
        amount: -999,
        payee_name: 'Amazon Digital',
        category_name: '📦 Amazon Orders',
      },
      {
        id: 'tx-refund',
        account: 'amazon-prime',
        account_name: '💳 Amazon Prime',
        date: '2024-01-17',
        amount: 1500,
        payee_name: 'Amazon',
        category_name: '📦 Amazon Orders',
      },
    ];

    const exportData = buildAmazonExportData({
      orderHistoryRows: [
        buildOrderRow({
          'Order ID': 'ORDER-TECH',
          'Ship Date': '2024-01-15',
          'Total Amount': '15.00',
          'Product Name': 'USB-C Cable',
          'Payment Method Type': 'Visa - 2143',
          ASIN: 'USB-1',
        }),
        buildOrderRow({
          'Order ID': 'ORDER-SPLIT',
          'Ship Date': '2024-02-15',
          'Total Amount': '30.00',
          'Product Name': 'Clorox Wipes',
          'Shipment Item Subtotal': '10.00',
          'Payment Method Type': 'MasterCard - 7264',
          ASIN: 'CLEAN-1',
        }),
        buildOrderRow({
          'Order ID': 'ORDER-SPLIT',
          'Ship Date': '2024-02-15',
          'Total Amount': '30.00',
          'Product Name': 'Shampoo',
          'Shipment Item Subtotal': '20.00',
          'Payment Method Type': 'MasterCard - 7264',
          ASIN: 'BEAUTY-1',
        }),
      ],
      refundDetailsRows: [
        buildRefundRow({
          'Order ID': 'ORDER-TECH',
          'Refund Date': '2024-01-17',
          'Refund Amount': '15.00',
        }),
      ],
      digitalOrderRows: [
        buildDigitalRow({
          'Order ID': 'DIGITAL-ORDER-1',
          'Fulfilled Date': '2024-03-01',
          'Order Date': '2024-03-01',
          'Transaction Amount': '9.99',
          'Product Name': 'Prime Membership Fee',
        }),
      ],
    });

    const audit = buildAmazonAudit(
      buildAmazonAuditInput({
        transactions,
        exportData,
        paths: {
          repoRoot: tempDir,
          amazonDataDir: tempDir,
          zipPath: join(tempDir, 'Your Orders.zip'),
          auditPath: join(tempDir, 'amazon-audit.json'),
          linksPath: join(tempDir, 'amazon-links.csv'),
          manualReviewPath: join(tempDir, 'amazon-manual-review.csv'),
          paymentMethodOverridesPath: join(tempDir, 'amazon-payment-method-overrides.json'),
          categoryOverridesPath: join(tempDir, 'amazon-category-overrides.json'),
        },
      }),
    );

    expect(audit.summary.manualReviewCount).toBe(0);
    expect(audit.summary.splitUpdateCount).toBe(1);
    expect(audit.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionId: 'tx-tech',
          status: 'ready-direct',
          recommendedCategoryName: '🔌 Tech & Electronics',
        }),
        expect.objectContaining({
          transactionId: 'tx-split',
          status: 'ready-split',
          recommendedSplit: expect.arrayContaining([
            expect.objectContaining({ categoryName: '🧹 Household Supplies', amountCents: -1000 }),
            expect.objectContaining({
              categoryName: '🧴 Personal Care & Beauty',
              amountCents: -2000,
            }),
          ]),
        }),
        expect.objectContaining({
          transactionId: 'tx-prime',
          status: 'ready-direct',
          recommendedCategoryName: '🧾 Amazon Membership',
        }),
        expect.objectContaining({
          transactionId: 'tx-refund',
          status: 'ready-direct',
          recommendedCategoryName: '🔌 Tech & Electronics',
        }),
      ]),
    );
    expect(
      audit.matches.some(
        (match) =>
          match.recommendedCategoryName === '📦 Amazon Orders' ||
          match.recommendedSplit.some((split) => split.categoryName === '📦 Amazon Orders'),
      ),
    ).toBe(false);
  });

  it('keeps ambiguous exact-amount matches in manual review', () => {
    const audit = buildAmazonAudit(
      buildAmazonAuditInput({
        transactions: [
          {
            id: 'tx-ambiguous',
            account: 'amazon-prime',
            account_name: '💳 Amazon Prime',
            date: '2024-04-10',
            amount: -1500,
            payee_name: 'Amazon',
            category_name: '📦 Amazon Orders',
          },
        ],
        exportData: buildAmazonExportData({
          orderHistoryRows: [
            buildOrderRow({
              'Order ID': 'ORDER-A',
              'Ship Date': '2024-04-09',
              'Total Amount': '15.00',
              'Payment Method Type': 'Visa - 2143',
              'Product Name': 'USB-C Cable',
            }),
            buildOrderRow({
              'Order ID': 'ORDER-B',
              'Ship Date': '2024-04-11',
              'Total Amount': '15.00',
              'Payment Method Type': 'Visa - 2143',
              'Product Name': 'USB-C Cable',
            }),
          ],
          refundDetailsRows: [],
          digitalOrderRows: [],
        }),
      }),
    );

    expect(audit.matches).toHaveLength(0);
    expect(audit.manualReviews).toEqual([
      expect.objectContaining({
        transactionId: 'tx-ambiguous',
        reason: 'Multiple exact Amazon order charge candidates matched this transaction.',
      }),
    ]);
  });

  it('uses expanded title rules for gifts, clothing, repairs, and home goods', () => {
    const audit = buildAmazonAudit(
      buildAmazonAuditInput({
        transactions: [
          {
            id: 'tx-gift',
            account: 'amazon-prime',
            account_name: '💳 Amazon Prime',
            date: '2024-05-01',
            amount: -1111,
            payee_name: 'Amazon',
            category_name: '📦 Amazon Orders',
          },
          {
            id: 'tx-clothing',
            account: 'amazon-prime',
            account_name: '💳 Amazon Prime',
            date: '2024-05-02',
            amount: -3070,
            payee_name: 'Amazon',
            category_name: '📦 Amazon Orders',
          },
          {
            id: 'tx-repair',
            account: 'amazon-prime',
            account_name: '💳 Amazon Prime',
            date: '2024-05-03',
            amount: -8659,
            payee_name: 'Amazon',
            category_name: '📦 Amazon Orders',
          },
          {
            id: 'tx-home',
            account: 'amazon-prime',
            account_name: '💳 Amazon Prime',
            date: '2024-05-04',
            amount: -2164,
            payee_name: 'Amazon',
            category_name: '📦 Amazon Orders',
          },
        ],
        exportData: buildAmazonExportData({
          orderHistoryRows: [
            buildOrderRow({
              'Order ID': 'ORDER-GIFT',
              'Ship Date': '2024-05-01',
              'Total Amount': '11.11',
              'Product Name': 'Amazon eGift Card - Galactic Birthday Balloons (Animated)',
            }),
            buildOrderRow({
              'Order ID': 'ORDER-CLOTHING',
              'Ship Date': '2024-05-02',
              'Total Amount': '30.70',
              'Product Name':
                "Amazon Essentials Men's Straight-Fit Stretch Bootcut Jean, Light Blue Vintage, 33W x 29L",
            }),
            buildOrderRow({
              'Order ID': 'ORDER-REPAIR',
              'Ship Date': '2024-05-03',
              'Total Amount': '86.59',
              'Product Name':
                'BUTURE Car Battery Jump Starter 6000A Jump Box 65W Fast Charging (All Gas/12.0L Diesel)',
            }),
            buildOrderRow({
              'Order ID': 'ORDER-HOME',
              'Ship Date': '2024-05-04',
              'Total Amount': '21.64',
              'Product Name':
                'GiuMsi 72"X72" Fabric Boho Mid Century Shower Curtain Set with Tassel',
            }),
          ],
          refundDetailsRows: [],
          digitalOrderRows: [],
        }),
      }),
    );

    expect(audit.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionId: 'tx-gift',
          recommendedCategoryName: '💝 Gifts & Cash Support',
        }),
        expect.objectContaining({
          transactionId: 'tx-clothing',
          recommendedCategoryName: '👕 Clothing',
        }),
        expect.objectContaining({
          transactionId: 'tx-repair',
          recommendedCategoryName: '🔧 Repairs',
        }),
        expect.objectContaining({
          transactionId: 'tx-home',
          recommendedCategoryName: '🪑 Home Goods & Furnishings',
        }),
      ]),
    );
  });

  it('allocates split cents exactly and applies them with category creation when needed', async () => {
    expect(
      allocateCategorySplitCents(-1001, [
        { categoryName: '🧴 Personal Care & Beauty', basisAmountCents: 2, itemTitles: ['A'] },
        { categoryName: '🧹 Household Supplies', basisAmountCents: 1, itemTitles: ['B'] },
      ]),
    ).toEqual([
      {
        categoryName: '🧴 Personal Care & Beauty',
        amountCents: -668,
        itemCount: 1,
        itemTitles: ['A'],
      },
      {
        categoryName: '🧹 Household Supplies',
        amountCents: -333,
        itemCount: 1,
        itemTitles: ['B'],
      },
    ]);

    const auditPath = join(tempDir, 'amazon-audit.json');
    const persistedAuditFile: AmazonAuditFile = {
      version: 1,
      createdAt: '2026-03-26T12:00:00.000Z',
      budgetStartDate: '2023-12-13',
      workspace: {
        amazonDataDir: tempDir,
        zipPath: join(tempDir, 'Your Orders.zip'),
        auditPath,
        linksPath: join(tempDir, 'amazon-links.csv'),
        manualReviewPath: join(tempDir, 'amazon-manual-review.csv'),
        paymentMethodOverridesPath: join(tempDir, 'amazon-payment-method-overrides.json'),
        categoryOverridesPath: join(tempDir, 'amazon-category-overrides.json'),
      },
      summary: {
        totalAmazonTransactions: 2,
        totalAmazonChargeTransactions: 2,
        totalAmazonRefundTransactions: 0,
        autoMatchedTransactionCount: 2,
        directUpdateCount: 1,
        splitUpdateCount: 1,
        alreadyAlignedCount: 0,
        manualReviewCount: 0,
        physicalChargeEventCount: 2,
        digitalChargeEventCount: 0,
        refundEventCount: 0,
        categoryRecommendationCounts: [],
      },
      paymentMethodMappings: {},
      warnings: [],
      matches: [
        {
          transactionId: 'tx-direct',
          transactionDate: '2024-01-15',
          transactionAmountCents: -1500,
          accountId: 'amazon-prime',
          accountName: '💳 Amazon Prime',
          payeeName: 'Amazon',
          currentCategoryName: '📦 Amazon Orders',
          eventKind: 'physical-charge',
          orderId: 'ORDER-1',
          eventDate: '2024-01-15',
          paymentMethodType: 'Visa - 2143',
          status: 'ready-direct',
          recommendedCategoryName: '🔌 Tech & Electronics',
          recommendedSplit: [],
          categorySource: 'title-rule',
          itemSummary: ['USB-C Cable'],
          matchedBy: 'exact-unique',
        },
        {
          transactionId: 'tx-split',
          transactionDate: '2024-02-15',
          transactionAmountCents: -3000,
          accountId: 'bilt',
          accountName: '💳 Bilt Rewards',
          payeeName: 'Amazon',
          currentCategoryName: '📦 Amazon Orders',
          eventKind: 'physical-charge',
          orderId: 'ORDER-2',
          eventDate: '2024-02-15',
          paymentMethodType: 'MasterCard - 7264',
          status: 'ready-split',
          recommendedCategoryName: null,
          recommendedSplit: [
            {
              categoryName: '🪑 Home Goods & Furnishings',
              amountCents: -2000,
              itemCount: 1,
              itemTitles: ['Lamp'],
            },
            {
              categoryName: '🧹 Household Supplies',
              amountCents: -1000,
              itemCount: 1,
              itemTitles: ['Cleaner'],
            },
          ],
          categorySource: 'split-allocation',
          itemSummary: ['Lamp', 'Cleaner'],
          matchedBy: 'exact-unique',
        },
      ],
      manualReviews: [],
    };
    await writeFile(auditPath, `${JSON.stringify(persistedAuditFile, null, 2)}\n`, 'utf8');

    vi.mocked(fetchAllAccounts).mockResolvedValue(accounts);
    vi.mocked(fetchAllOnBudgetTransactionsWithMetadata).mockResolvedValue(
      buildTransactionFetchResult([
        {
          id: 'tx-direct',
          account: 'amazon-prime',
          account_name: '💳 Amazon Prime',
          date: '2024-01-15',
          amount: -1500,
          payee_name: 'Amazon',
          category_name: '📦 Amazon Orders',
        },
        {
          id: 'tx-split',
          account: 'bilt',
          account_name: '💳 Bilt Rewards',
          date: '2024-02-15',
          amount: -3000,
          payee_name: 'Amazon',
          category_name: '📦 Amazon Orders',
        },
      ]),
    );
    vi.mocked(getCategories).mockResolvedValue(
      buildCategories([
        { id: 'household-id', name: '🧹 Household Supplies', group_id: 'housing-group' },
      ]),
    );
    vi.mocked(getCategoryGroups).mockResolvedValue(
      buildCategoryGroups([
        { id: 'discretionary-group', name: '🎯 DISCRETIONARY' },
        { id: 'housing-group', name: '🏠 HOUSING' },
      ]),
    );
    vi.mocked(createCategory)
      .mockResolvedValueOnce('tech-id')
      .mockResolvedValueOnce('home-goods-id');

    const result = await applyAmazonAudit({
      repoRoot: tempDir,
      amazonDataDir: tempDir,
      zipPath: join(tempDir, 'Your Orders.zip'),
      auditPath,
      linksPath: join(tempDir, 'amazon-links.csv'),
      manualReviewPath: join(tempDir, 'amazon-manual-review.csv'),
      paymentMethodOverridesPath: join(tempDir, 'amazon-payment-method-overrides.json'),
      categoryOverridesPath: join(tempDir, 'amazon-category-overrides.json'),
    });

    expect(result.categoriesCreated).toEqual([
      '🔌 Tech & Electronics',
      '🪑 Home Goods & Furnishings',
    ]);
    expect(result.directUpdatesApplied).toBe(1);
    expect(result.splitUpdatesApplied).toBe(1);
    expect(createCategory).toHaveBeenCalledWith({
      name: '🔌 Tech & Electronics',
      group_id: 'discretionary-group',
    });
    expect(createCategory).toHaveBeenCalledWith({
      name: '🪑 Home Goods & Furnishings',
      group_id: 'housing-group',
    });
    expect(updateTransaction).toHaveBeenCalledWith(
      'tx-direct',
      expect.objectContaining({ category: 'tech-id' }),
    );
    expect(updateTransaction).toHaveBeenCalledWith('tx-split', {
      category: null,
      subtransactions: [
        {
          amount: -2000,
          category: 'home-goods-id',
          notes: 'Amazon: Lamp',
        },
        {
          amount: -1000,
          category: 'household-id',
          notes: 'Amazon: Cleaner',
        },
      ],
    });

    const persistedAudit = JSON.parse(await readFile(auditPath, 'utf8')) as AmazonAuditFile;
    expect(persistedAudit.version).toBe(1);
  });
});
