import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseCsv } from 'csv-parse/sync';
import { stringify as stringifyCsv } from 'csv-stringify/sync';
import { strFromU8, unzipSync } from 'fflate';
import {
  createCategory,
  getCategories,
  getCategoryGroups,
  updateTransaction,
} from '../api/actual-client.js';
import { resolveLocalReconciliationPath } from './local-reconciliation-workspace.js';
import { fetchAllAccounts } from '../data/fetch-accounts.js';
import { fetchAllOnBudgetTransactionsWithMetadata } from '../data/fetch-transactions.js';
import type { Account, Category, CategoryGroup, Transaction } from '../types/domain.js';

const AMAZON_ORDER_HISTORY_PATH = 'Your Amazon Orders/Order History.csv';
const AMAZON_DIGITAL_ORDERS_PATH = 'Your Amazon Orders/Digital Content Orders.csv';
const AMAZON_REFUND_DETAILS_PATH = 'Your Returns & Refunds/Refund Details.csv';

const AMAZON_ORDERS_ZIP_FILENAME = 'Your Orders.zip';
const AMAZON_AUDIT_FILENAME = 'amazon-audit.json';
const AMAZON_LINKS_FILENAME = 'amazon-links.csv';
const AMAZON_MANUAL_REVIEW_FILENAME = 'amazon-manual-review.csv';
const AMAZON_PAYMENT_METHOD_OVERRIDES_FILENAME = 'amazon-payment-method-overrides.json';
const AMAZON_CATEGORY_OVERRIDES_FILENAME = 'amazon-category-overrides.json';

const AMAZON_ANALYSIS_VERSION = 1;
const ALL_HISTORY_START_DATE = '1900-01-01';
const FAR_FUTURE_DATE = '2100-12-31';
const MATCH_WINDOW_DAYS = 3;

const AMAZON_MEMBERSHIP_CATEGORY_NAME = '🧾 Amazon Membership';
const AMAZON_ORDERS_LEGACY_CATEGORY_NAME = '📦 Amazon Orders';
const AMAZON_FALLBACK_CATEGORY_NAME = '🛍️ Shopping / Marketplace';
const TECH_CATEGORY_NAME = '🔌 Tech & Electronics';
const HOME_GOODS_CATEGORY_NAME = '🪑 Home Goods & Furnishings';

const CATEGORY_TARGETS = {
  amazonMembership: { name: AMAZON_MEMBERSHIP_CATEGORY_NAME },
  householdSupplies: { name: '🧹 Household Supplies' },
  personalCareAndBeauty: { name: '🧴 Personal Care & Beauty' },
  medicine: { name: '💊 Medicine' },
  clothing: { name: '👕 Clothing' },
  groceries: { name: '🛒 Groceries' },
  media: { name: '📖 Media' },
  nosferatu: { name: '🐈‍⬛ Nosferatu' },
  ziah: { name: '👶 Ziah' },
  gianna: { name: '👧 Gianna' },
  gifts: { name: '💝 Gifts & Cash Support' },
  otherSubscriptions: { name: '📺 Other Subscriptions' },
  shopping: { name: AMAZON_FALLBACK_CATEGORY_NAME },
  tech: { name: TECH_CATEGORY_NAME, groupName: '🎯 DISCRETIONARY' },
  homeGoods: { name: HOME_GOODS_CATEGORY_NAME, groupName: '🏠 HOUSING' },
  repairs: { name: '🔧 Repairs' },
  oneOffTravel: { name: '✈️ One-Off / Travel' },
} as const;

type CategoryTargetConfig = (typeof CATEGORY_TARGETS)[keyof typeof CATEGORY_TARGETS] & {
  groupName?: string;
};

const SEEDED_PAYMENT_METHOD_ACCOUNT_NAMES = {
  'Visa - 2143': '💳 Amazon Prime',
  'MasterCard - 7264': '💳 Bilt Rewards',
} as const;

const NON_VALUE_SENTINELS = new Set(['', 'Not Available', 'Not Applicable']);

interface AmazonOrderHistoryRow {
  ASIN: string;
  'Billing Address': string;
  'Carrier Name & Tracking Number': string;
  Currency: string;
  'Gift Message': string;
  'Gift Recipient Contact': string;
  'Gift Sender Name': string;
  'Item Serial Number': string;
  'Order Date': string;
  'Order ID': string;
  'Order Status': string;
  'Original Quantity': string;
  'Payment Method Type': string;
  'Product Condition': string;
  'Product Name': string;
  'Purchase Order Number': string;
  'Ship Date': string;
  'Shipment Item Subtotal': string;
  'Shipment Item Subtotal Tax': string;
  'Shipment Status': string;
  'Shipping Address': string;
  'Shipping Charge': string;
  'Shipping Option': string;
  'Total Amount': string;
  'Total Discounts': string;
  'Unit Price': string;
  'Unit Price Tax': string;
  Website: string;
}

interface AmazonRefundDetailsRow {
  'Creation Date': string;
  Currency: string;
  'Direct Debit Refund Amount': string;
  'Disbursement Type': string;
  'Order ID': string;
  'Payment Status': string;
  Quantity: string;
  'Refund Amount': string;
  'Refund Date': string;
  'Reversal Amount State': string;
  'Reversal Reason': string;
  'Reversal Status': string;
  Website: string;
}

interface AmazonDigitalOrdersRow {
  ASIN: string;
  'Affected Item Quantity': string;
  'Alternative Order Providing Payment': string;
  'Base Currency': string;
  'Base Currency Code': string;
  'Billing Address': string;
  'Claim Code': string;
  'Component Type': string;
  'Country Code': string;
  'Customer Declared Address': string;
  'Declared Country Code': string;
  'Delivery Date': string;
  'Delivery Packet ID': string;
  'Delivery Status': string;
  'Digital Order Item Attributes': string;
  'Digital Order Item ID': string;
  'Does Order Depend On Another Order': string;
  'FX Currency Code': string;
  'FX Transaction Amount': string;
  'Fulfilled Date': string;
  'Fulfillment Mobile Number': string;
  'Fullfilment Status': string;
  'Gift Claim Date': string;
  'Gift Customer Nickname': string;
  'Gift Email': string;
  'Gift Item': string;
  'Gift Message': string;
  'Gift Redemption': string;
  'Installment Our Price': string;
  'Installment Our Price Plus Tax': string;
  'Installment Price Currency Code': string;
  'Installment Price Plus Tax Currency Code': string;
  'Is Order A Preorder': string;
  'Is Order Eligible For Prime Benefit': string;
  'Is Order Free Replacement': string;
  'Item Fulfilled': string;
  'Item Merged From Another Order': string;
  'List Price Amount': string;
  'List Price Currency Code': string;
  'List Price Tax Amount': string;
  'List Price Tax Currency Code': string;
  Marketplace: string;
  'Offer Type Code': string;
  'Offering SKU': string;
  'Order Date': string;
  'Order ID': string;
  'Order Status': string;
  'Ordering Customer Nickname': string;
  'Original Quantity': string;
  'Paid By Other Customer': string;
  'Payment Information': string;
  'Previously Paid Digital Order Item ID': string;
  PreviouslyPaidOrderId: string;
  Price: string;
  'Price Currency Code': string;
  'Price Tax': string;
  'Price Tax Currency Code': string;
  'Product Name': string;
  Publisher: string;
  'Quantity Ordered': string;
  'Recharge Amount': string;
  'Recharge Amount Currency Code': string;
  'Recipient Email': string;
  'Related Physical Order ID': string;
  'Seller Of Record': string;
  'Session ID': string;
  'Ship From': string;
  'Ship To': string;
  'Shipping Address': string;
  'Shopping Marketplace ID': string;
  'Subscription Order Info List': string;
  'Subscription Order Type': string;
  'Third Party Display Currency Code': string;
  'Third Party Display Price': string;
  'Transaction Amount': string;
  'Unique Browser ID': string;
}

interface AmazonChargeItem {
  asin: string | null;
  productName: string;
  normalizedTitle: string;
  basisAmountCents: number;
  quantity: number;
  shippingAddress: string | null;
  giftRecipient: string | null;
  giftSender: string | null;
  giftMessage: string | null;
  source: 'physical' | 'digital';
}

interface AmazonChargeEvent {
  id: string;
  kind: 'physical-charge' | 'digital-charge';
  orderId: string;
  eventDate: string;
  amountCents: number;
  paymentMethodType: string | null;
  items: AmazonChargeItem[];
}

interface AmazonRefundEvent {
  id: string;
  kind: 'refund';
  orderId: string;
  eventDate: string;
  amountCents: number;
  reason: string;
}

type AmazonEvent = AmazonChargeEvent | AmazonRefundEvent;

export interface AmazonExportData {
  orderHistoryRows: AmazonOrderHistoryRow[];
  refundDetailsRows: AmazonRefundDetailsRow[];
  digitalOrderRows: AmazonDigitalOrdersRow[];
}

interface AmazonPaymentMethodOverridesFile {
  paymentMethods?: Record<string, string>;
}

interface AmazonCategoryOverridesFile {
  orderIds?: Record<string, string>;
  asins?: Record<string, string>;
  normalizedTitles?: Record<string, string>;
}

export interface AmazonWorkspacePaths {
  repoRoot: string;
  amazonDataDir: string;
  zipPath: string;
  auditPath: string;
  linksPath: string;
  manualReviewPath: string;
  paymentMethodOverridesPath: string;
  categoryOverridesPath: string;
}

export interface AmazonCategoryBreakdown {
  categoryName: string;
  amountCents: number;
  itemCount: number;
  itemTitles: string[];
}

export interface AmazonAuditMatch {
  transactionId: string;
  transactionDate: string;
  transactionAmountCents: number;
  accountId: string;
  accountName: string;
  payeeName: string;
  currentCategoryName: string | null;
  eventKind: AmazonChargeEvent['kind'] | AmazonRefundEvent['kind'];
  orderId: string;
  eventDate: string;
  paymentMethodType: string | null;
  status: 'already-aligned' | 'ready-direct' | 'ready-split';
  recommendedCategoryName: string | null;
  recommendedSplit: AmazonCategoryBreakdown[];
  categorySource: string;
  itemSummary: string[];
  matchedBy: 'exact-unique';
}

export interface AmazonManualReviewRecord {
  transactionId: string;
  transactionDate: string;
  transactionAmountCents: number;
  accountId: string;
  accountName: string;
  payeeName: string;
  currentCategoryName: string | null;
  reason: string;
  candidateOrderIds: string[];
  candidatePaymentMethods: string[];
  candidateEventDates: string[];
}

export interface AmazonAuditFile {
  version: number;
  createdAt: string;
  budgetStartDate: string;
  workspace: Pick<
    AmazonWorkspacePaths,
    | 'amazonDataDir'
    | 'zipPath'
    | 'auditPath'
    | 'linksPath'
    | 'manualReviewPath'
    | 'paymentMethodOverridesPath'
    | 'categoryOverridesPath'
  >;
  summary: {
    totalAmazonTransactions: number;
    totalAmazonChargeTransactions: number;
    totalAmazonRefundTransactions: number;
    autoMatchedTransactionCount: number;
    directUpdateCount: number;
    splitUpdateCount: number;
    alreadyAlignedCount: number;
    manualReviewCount: number;
    physicalChargeEventCount: number;
    digitalChargeEventCount: number;
    refundEventCount: number;
    categoryRecommendationCounts: Array<{ categoryName: string; transactionCount: number }>;
  };
  paymentMethodMappings: Record<
    string,
    { accountName: string; source: 'seed' | 'derived' | 'override' }
  >;
  warnings: string[];
  matches: AmazonAuditMatch[];
  manualReviews: AmazonManualReviewRecord[];
}

export interface AmazonApplyResult {
  categoriesCreated: string[];
  directUpdatesApplied: number;
  splitUpdatesApplied: number;
  skippedAlreadyAligned: number;
  skippedMissingTransactions: number;
  skippedChangedTransactions: number;
}

interface BuildAmazonAuditInput {
  accounts: Account[];
  transactions: Transaction[];
  exportData: AmazonExportData;
  budgetStartDate: string;
  paymentMethodOverrides?: AmazonPaymentMethodOverridesFile;
  categoryOverrides?: AmazonCategoryOverridesFile;
  paths?: AmazonWorkspacePaths;
}

interface ItemCategoryResolution {
  categoryName: string | null;
  source: string;
}

interface ChargeClassification {
  status: 'direct' | 'split' | 'manual-review';
  categoryName: string | null;
  split: AmazonCategoryBreakdown[];
  source: string;
  reason: string | null;
}

interface RefundClassification {
  status: 'direct' | 'manual-review';
  categoryName: string | null;
  source: string;
  reason: string | null;
}

interface CurrentTransactionSnapshot {
  id: string;
  date: string;
  amountCents: number;
  payeeName: string;
  categoryName: string | null;
  isParent: boolean;
  isChild: boolean;
  transferId: string | null;
}

function repoRootFromModule(): string {
  return resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
}

export function resolveAmazonWorkspacePaths(repoRoot = repoRootFromModule()): AmazonWorkspacePaths {
  const amazonDataDir = resolveLocalReconciliationPath('amazon', repoRoot);

  return {
    repoRoot,
    amazonDataDir,
    zipPath: resolve(amazonDataDir, AMAZON_ORDERS_ZIP_FILENAME),
    auditPath: resolve(amazonDataDir, AMAZON_AUDIT_FILENAME),
    linksPath: resolve(amazonDataDir, AMAZON_LINKS_FILENAME),
    manualReviewPath: resolve(amazonDataDir, AMAZON_MANUAL_REVIEW_FILENAME),
    paymentMethodOverridesPath: resolve(amazonDataDir, AMAZON_PAYMENT_METHOD_OVERRIDES_FILENAME),
    categoryOverridesPath: resolve(amazonDataDir, AMAZON_CATEGORY_OVERRIDES_FILENAME),
  };
}

function normalizeString(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return NON_VALUE_SENTINELS.has(trimmed) ? null : trimmed;
}

function normalizeProductTitle(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseMoneyToCents(value: string | null | undefined): number | null {
  const normalized = normalizeString(value);

  if (normalized == null) {
    return null;
  }

  const parsed = Number.parseFloat(normalized.replace(/,/g, ''));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

function parseInteger(value: string | null | undefined, fallback = 1): number {
  const normalized = normalizeString(value);

  if (normalized == null) {
    return fallback;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeIsoDate(value: string | null | undefined): string | null {
  const normalized = normalizeString(value);

  if (normalized == null) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  return normalized.length >= 10 ? normalized.slice(0, 10) : null;
}

function diffInDays(dateA: string, dateB: string): number {
  const millis = Math.abs(new Date(dateA).getTime() - new Date(dateB).getTime());
  return millis / (1000 * 60 * 60 * 24);
}

function parseCsvRows<T>(csvText: string): T[] {
  return parseCsv(csvText, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  }) as T[];
}

function readZipEntry(entries: Record<string, Uint8Array>, entryPath: string): string {
  const entry = entries[entryPath];

  if (!entry) {
    throw new Error(`Amazon export is missing required entry: ${entryPath}`);
  }

  return strFromU8(entry);
}

export async function loadAmazonExportDataFromZip(
  zipPath: string,
  budgetStartDate: string,
): Promise<AmazonExportData> {
  const zipBuffer = await readFile(zipPath);
  const entries = unzipSync(new Uint8Array(zipBuffer));

  const orderHistoryRows = parseCsvRows<AmazonOrderHistoryRow>(
    readZipEntry(entries, AMAZON_ORDER_HISTORY_PATH),
  ).filter((row) => {
    const orderDate = normalizeIsoDate(row['Order Date']);
    return orderDate !== null && orderDate >= budgetStartDate;
  });

  const refundDetailsRows = parseCsvRows<AmazonRefundDetailsRow>(
    readZipEntry(entries, AMAZON_REFUND_DETAILS_PATH),
  ).filter((row) => {
    const refundDate = normalizeIsoDate(row['Refund Date']);
    return refundDate !== null && refundDate >= budgetStartDate;
  });

  const digitalOrderRows = parseCsvRows<AmazonDigitalOrdersRow>(
    readZipEntry(entries, AMAZON_DIGITAL_ORDERS_PATH),
  ).filter((row) => {
    const fulfilledDate = normalizeIsoDate(row['Fulfilled Date'] || row['Order Date']);
    return fulfilledDate !== null && fulfilledDate >= budgetStartDate;
  });

  return {
    orderHistoryRows,
    refundDetailsRows,
    digitalOrderRows,
  };
}

function buildPhysicalChargeEvents(orderHistoryRows: AmazonOrderHistoryRow[]): AmazonChargeEvent[] {
  const grouped = new Map<string, AmazonChargeEvent>();

  for (const row of orderHistoryRows) {
    const eventDate = normalizeIsoDate(row['Ship Date'] || row['Order Date']);
    const amountCents = parseMoneyToCents(row['Total Amount']);
    const orderId = normalizeString(row['Order ID']);

    if (eventDate == null || amountCents == null || amountCents <= 0 || orderId == null) {
      continue;
    }

    const paymentMethodType = normalizeString(row['Payment Method Type']);
    const eventKey = [orderId, eventDate, paymentMethodType ?? '', amountCents].join('|||');
    const itemBasisCents =
      (parseMoneyToCents(row['Shipment Item Subtotal']) ?? 0) +
      (parseMoneyToCents(row['Shipment Item Subtotal Tax']) ?? 0);
    const item: AmazonChargeItem = {
      asin: normalizeString(row.ASIN),
      productName: row['Product Name'],
      normalizedTitle: normalizeProductTitle(row['Product Name']),
      basisAmountCents: itemBasisCents,
      quantity: parseInteger(row['Original Quantity']),
      shippingAddress: normalizeString(row['Shipping Address']),
      giftRecipient: normalizeString(row['Gift Recipient Contact']),
      giftSender: normalizeString(row['Gift Sender Name']),
      giftMessage: normalizeString(row['Gift Message']),
      source: 'physical',
    };

    const existing = grouped.get(eventKey);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    grouped.set(eventKey, {
      id: `physical:${eventKey}`,
      kind: 'physical-charge',
      orderId,
      eventDate,
      amountCents,
      paymentMethodType,
      items: [item],
    });
  }

  for (const event of grouped.values()) {
    if (event.items.length === 1 && event.items[0].basisAmountCents === 0) {
      event.items[0].basisAmountCents = event.amountCents;
    }
  }

  return [...grouped.values()];
}

function buildDigitalChargeEvents(digitalOrderRows: AmazonDigitalOrdersRow[]): AmazonChargeEvent[] {
  const uniqueComponents = new Map<
    string,
    {
      orderId: string;
      eventDate: string;
      productName: string;
      asin: string | null;
      amountCents: number;
      giftEmail: string | null;
      giftMessage: string | null;
      shippingAddress: string | null;
    }
  >();

  for (const row of digitalOrderRows) {
    const orderId = normalizeString(row['Order ID']);
    const eventDate = normalizeIsoDate(row['Fulfilled Date'] || row['Order Date']);
    const amountCents = parseMoneyToCents(row['Transaction Amount']);

    if (orderId == null || eventDate == null || amountCents == null || amountCents <= 0) {
      continue;
    }

    const componentKey = [
      orderId,
      eventDate,
      row['Product Name'],
      normalizeString(row['Component Type']) ?? '',
      amountCents,
    ].join('|||');

    if (uniqueComponents.has(componentKey)) {
      continue;
    }

    uniqueComponents.set(componentKey, {
      orderId,
      eventDate,
      productName: row['Product Name'],
      asin: normalizeString(row.ASIN),
      amountCents,
      giftEmail: normalizeString(row['Gift Email']),
      giftMessage: normalizeString(row['Gift Message']),
      shippingAddress: normalizeString(row['Shipping Address']),
    });
  }

  const grouped = new Map<string, AmazonChargeEvent>();

  for (const component of uniqueComponents.values()) {
    const eventKey = `${component.orderId}|||${component.eventDate}`;
    const existing = grouped.get(eventKey);

    if (!existing) {
      grouped.set(eventKey, {
        id: `digital:${eventKey}`,
        kind: 'digital-charge',
        orderId: component.orderId,
        eventDate: component.eventDate,
        amountCents: component.amountCents,
        paymentMethodType: null,
        items: [
          {
            asin: component.asin,
            productName: component.productName,
            normalizedTitle: normalizeProductTitle(component.productName),
            basisAmountCents: component.amountCents,
            quantity: 1,
            shippingAddress: component.shippingAddress,
            giftRecipient: component.giftEmail,
            giftSender: null,
            giftMessage: component.giftMessage,
            source: 'digital',
          },
        ],
      });
      continue;
    }

    existing.amountCents += component.amountCents;

    const existingItem = existing.items.find(
      (item) => item.productName === component.productName && item.asin === component.asin,
    );

    if (existingItem) {
      existingItem.basisAmountCents += component.amountCents;
      continue;
    }

    existing.items.push({
      asin: component.asin,
      productName: component.productName,
      normalizedTitle: normalizeProductTitle(component.productName),
      basisAmountCents: component.amountCents,
      quantity: 1,
      shippingAddress: component.shippingAddress,
      giftRecipient: component.giftEmail,
      giftSender: null,
      giftMessage: component.giftMessage,
      source: 'digital',
    });
  }

  return [...grouped.values()].filter((event) => event.amountCents > 0);
}

function buildRefundEvents(refundDetailsRows: AmazonRefundDetailsRow[]): AmazonRefundEvent[] {
  const grouped = new Map<string, AmazonRefundEvent>();

  for (const row of refundDetailsRows) {
    const orderId = normalizeString(row['Order ID']);
    const eventDate = normalizeIsoDate(row['Refund Date']);
    const amountCents = parseMoneyToCents(row['Refund Amount']);

    if (orderId == null || eventDate == null || amountCents == null || amountCents <= 0) {
      continue;
    }

    const key = [orderId, eventDate, amountCents].join('|||');

    if (grouped.has(key)) {
      continue;
    }

    grouped.set(key, {
      id: `refund:${key}`,
      kind: 'refund',
      orderId,
      eventDate,
      amountCents,
      reason: normalizeString(row['Reversal Reason']) ?? 'Unknown',
    });
  }

  return [...grouped.values()];
}

function isAmazonTransaction(transaction: Transaction): boolean {
  const searchText = [
    transaction.payee_name,
    transaction.imported_payee,
    transaction.payee,
    transaction.category_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    searchText.includes('amazon') ||
    searchText.includes('amzn') ||
    transaction.category_name === AMAZON_ORDERS_LEGACY_CATEGORY_NAME ||
    transaction.category_name === AMAZON_MEMBERSHIP_CATEGORY_NAME
  );
}

function summarizePayeeName(transaction: Transaction): string {
  return transaction.payee_name || transaction.imported_payee || transaction.payee || '(No payee)';
}

export function allocateCategorySplitCents(
  totalAmountCents: number,
  groupedBasis: Array<{ categoryName: string; basisAmountCents: number; itemTitles: string[] }>,
): AmazonCategoryBreakdown[] {
  if (groupedBasis.length === 0) {
    return [];
  }

  const sign = totalAmountCents < 0 ? -1 : 1;
  const totalAbsoluteAmount = Math.abs(totalAmountCents);
  const totalBasis = groupedBasis.reduce((sum, item) => sum + item.basisAmountCents, 0);

  if (totalBasis <= 0) {
    return [];
  }

  const provisional = groupedBasis.map((item) => ({
    categoryName: item.categoryName,
    itemCount: item.itemTitles.length,
    itemTitles: [...item.itemTitles],
    basisAmountCents: item.basisAmountCents,
    amountCents: Math.floor((totalAbsoluteAmount * item.basisAmountCents) / totalBasis),
  }));

  const allocated = provisional.reduce((sum, item) => sum + item.amountCents, 0);
  const remainder = totalAbsoluteAmount - allocated;

  if (remainder > 0) {
    const target = provisional.reduce(
      (largest, item, index) => {
        if (largest === null) {
          return index;
        }

        return item.basisAmountCents > provisional[largest].basisAmountCents ? index : largest;
      },
      null as number | null,
    );

    if (target !== null) {
      provisional[target].amountCents += remainder;
    }
  }

  return provisional.map((item) => ({
    categoryName: item.categoryName,
    amountCents: item.amountCents * sign,
    itemCount: item.itemCount,
    itemTitles: item.itemTitles,
  }));
}

function overrideCategoryForItem(
  item: AmazonChargeItem,
  orderId: string,
  overrides: AmazonCategoryOverridesFile,
): string | null {
  const byOrderId = overrides.orderIds?.[orderId];

  if (byOrderId) {
    return byOrderId;
  }

  if (item.asin && overrides.asins?.[item.asin]) {
    return overrides.asins[item.asin] ?? null;
  }

  if (overrides.normalizedTitles?.[item.normalizedTitle]) {
    return overrides.normalizedTitles[item.normalizedTitle] ?? null;
  }

  return null;
}

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function resolveCategoryForItem(
  item: AmazonChargeItem,
  orderId: string,
  overrides: AmazonCategoryOverridesFile,
): ItemCategoryResolution {
  const override = overrideCategoryForItem(item, orderId, overrides);

  if (override) {
    return { categoryName: override, source: 'override' };
  }

  const title = item.normalizedTitle;
  const shippingAddress = (item.shippingAddress || '').toLowerCase();
  const giftRecipient = (item.giftRecipient || '').toLowerCase();
  const giftSender = (item.giftSender || '').toLowerCase();
  const giftMessage = (item.giftMessage || '').toLowerCase();

  if (includesAny(`${giftRecipient} ${giftSender} ${giftMessage}`, [/gift/i])) {
    return { categoryName: CATEGORY_TARGETS.gifts.name, source: 'gift-metadata' };
  }

  if (shippingAddress.includes('ziah') || giftRecipient.includes('ziah')) {
    return { categoryName: CATEGORY_TARGETS.ziah.name, source: 'shipping-address' };
  }

  if (shippingAddress.includes('gianna') || giftRecipient.includes('gianna')) {
    return { categoryName: CATEGORY_TARGETS.gianna.name, source: 'shipping-address' };
  }

  if (
    includesAny(`${title} ${shippingAddress}`, [
      /\bcat\b/,
      /\bkitty\b/,
      /\blitter\b/,
      /\bsheba\b/,
      /\bblue buffalo\b/,
      /\bpet bowl\b/,
      /\bpet food\b/,
      /\bcat treat\b/,
      /\bkitten\b/,
    ])
  ) {
    return { categoryName: CATEGORY_TARGETS.nosferatu.name, source: 'pet-rule' };
  }

  if (item.source === 'digital') {
    if (includesAny(title, [/\bprime\b.*\bfee\b/, /\bprime lt35 fee\b/, /\bprime membership\b/])) {
      return { categoryName: CATEGORY_TARGETS.amazonMembership.name, source: 'digital-rule' };
    }

    if (
      includesAny(title, [
        /\baudible\b/,
        /\bkindle\b/,
        /\bbook\b/,
        /\bebook\b/,
        /\be book\b/,
        /\bmagazine\b/,
        /\bmovie\b/,
        /\bmusic\b/,
        /\bvideo\b/,
        /\bdownloader\b/,
      ])
    ) {
      return { categoryName: CATEGORY_TARGETS.media.name, source: 'digital-rule' };
    }

    return { categoryName: CATEGORY_TARGETS.otherSubscriptions.name, source: 'digital-rule' };
  }

  if (
    giftRecipient ||
    giftSender ||
    giftMessage ||
    includesAny(title, [/\bgift\b/, /\bpresent\b/, /\begift card\b/, /\bgift card\b/])
  ) {
    return { categoryName: CATEGORY_TARGETS.gifts.name, source: 'gift-rule' };
  }

  if (
    includesAny(title, [
      /\bvitamin\b/,
      /\bsupplement\b/,
      /\bmelatonin\b/,
      /\bb12\b/,
      /\bnac\b/,
      /\bantifungal\b/,
      /\bfolliculitis\b/,
      /\bringworm\b/,
      /\bmedicine\b/,
      /\bcapsule\b/,
      /\bmcg\b/,
      /\bhealth\b/,
      /\bboric acid\b/,
      /\bsuppositor(?:y|ies)\b/,
      /\bacetaminophen\b/,
      /\bpain relief\b/,
      /\byeast infection\b/,
    ])
  ) {
    return { categoryName: CATEGORY_TARGETS.medicine.name, source: 'title-rule' };
  }

  if (
    includesAny(title, [
      /\bjacket\b/,
      /\bsuit\b/,
      /\bkurta\b/,
      /\bpajama\b/,
      /\bdress\b/,
      /\bbodysuit\b/,
      /\bshirt\b/,
      /\bpants\b/,
      /\bjeans?\b/,
      /\blingerie\b/,
      /\bunderwear\b/,
      /\bhoodie\b/,
      /\bshoe\b/,
      /\bsneaker\b/,
      /\bsock\b/,
      /\bbeanie\b/,
      /\bhat\b/,
      /\bbaseball cap\b/,
      /\btrucker cap\b/,
      /\bsunglasses?\b/,
      /\bbackpack\b/,
    ])
  ) {
    return { categoryName: CATEGORY_TARGETS.clothing.name, source: 'title-rule' };
  }

  if (
    includesAny(title, [
      /\bpowder\b/,
      /\bbeauty\b/,
      /\bhair\b/,
      /\bshampoo\b/,
      /\bconditioner\b/,
      /\bpiercing\b/,
      /\bseptum\b/,
      /\bearring\b/,
      /\bjewelry\b/,
      /\bmakeup\b/,
      /\bwax\b/,
      /\bskincare\b/,
      /\bbody wash\b/,
      /\bsoap\b/,
      /\blotion\b/,
      /\bdeodorant\b/,
      /\bperfume\b/,
      /\bfragrance\b/,
      /\bnail polish\b/,
      /\btoothpowder\b/,
      /\bdental floss\b/,
      /\bfloss\b/,
      /\boral b\b/,
    ])
  ) {
    return { categoryName: CATEGORY_TARGETS.personalCareAndBeauty.name, source: 'title-rule' };
  }

  if (
    includesAny(title, [
      /\bpaper towels?\b/,
      /\btoilet paper\b/,
      /\bclorox\b/,
      /\bdetergent\b/,
      /\bwipes\b/,
      /\blaundry\b/,
      /\btrash\b/,
      /\bclean\b/,
      /\bhousehold\b/,
      /\btissues?\b/,
      /\bsponges?\b/,
      /\bshelf liner\b/,
    ])
  ) {
    return { categoryName: CATEGORY_TARGETS.householdSupplies.name, source: 'title-rule' };
  }

  if (
    includesAny(title, [
      /\bbanana\b/,
      /\bgrocery\b/,
      /\bsnack\b/,
      /\bbeverage\b/,
      /\bdrink\b/,
      /\btea\b/,
      /\bcoffee\b/,
      /\bchips?\b/,
      /\bcookies?\b/,
      /\bhot sauce\b/,
    ])
  ) {
    return { categoryName: CATEGORY_TARGETS.groceries.name, source: 'title-rule' };
  }

  if (
    includesAny(title, [
      /\bkindle\b/,
      /\bbook\b/,
      /\bmagazine\b/,
      /\bvinyl\b/,
      /\bdvd\b/,
      /\bblu ray\b/,
      /\bblu-ray\b/,
      /\bcomic\b/,
      /\bmovie\b/,
      /\balbum\b/,
      /\baudible\b/,
      /\bguidebook\b/,
      /\boracle\b/,
      /\bboard game\b/,
      /\bdeck\b/,
    ])
  ) {
    return { categoryName: CATEGORY_TARGETS.media.name, source: 'title-rule' };
  }

  if (
    includesAny(title, [
      /\bssd\b/,
      /\bprojector\b/,
      /\bcamera\b/,
      /\bearbuds?\b/,
      /\bheadphones?\b/,
      /\bwi fi\b/,
      /\bwifi\b/,
      /\bbluetooth\b/,
      /\bzigbee\b/,
      /\bsmart switch\b/,
      /\bcharger\b/,
      /\bcable\b/,
      /\bkeyboard\b/,
      /\bmouse\b/,
      /\bmonitor\b/,
      /\brouter\b/,
      /\bmemory\b/,
      /\bsd card\b/,
      /\bexternal\b/,
      /\busb\b/,
      /\becho\b/,
      /\bscreen protector\b/,
      /\bspeaker stand\b/,
      /\bmic stand\b/,
      /\bmicrophone stand\b/,
    ])
  ) {
    return { categoryName: CATEGORY_TARGETS.tech.name, source: 'title-rule' };
  }

  if (
    includesAny(title, [
      /\bjump starter\b/,
      /\bjump box\b/,
      /\bjumper cables?\b/,
      /\bcar battery\b/,
      /\bdrywall repair\b/,
      /\brepair kit\b/,
      /\bwall repair\b/,
    ])
  ) {
    return { categoryName: CATEGORY_TARGETS.repairs.name, source: 'title-rule' };
  }

  if (includesAny(title, [/\bsuitcase\b/, /\bluggage\b/, /\btravel\b/, /\btsa\b/])) {
    return { categoryName: CATEGORY_TARGETS.oneOffTravel.name, source: 'title-rule' };
  }

  if (
    includesAny(title, [
      /\bchair\b/,
      /\bbean bag\b/,
      /\bair purifier\b/,
      /\bwater cooler\b/,
      /\bfilter system\b/,
      /\bdispenser\b/,
      /\blamp\b/,
      /\bcountertop\b/,
      /\bfurniture\b/,
      /\bpillow\b/,
      /\bblanket\b/,
      /\bmatress\b/,
      /\bmattress\b/,
      /\bmirror\b/,
      /\bshelves?\b/,
      /\bshower curtain\b/,
      /\bdehumidifier\b/,
      /\bhooks?\b/,
      /\bknobs?\b/,
      /\bcontainer\b/,
      /\bdrain cover\b/,
      /\btowel\b/,
      /\bair fryer\b/,
      /\bbulletin board\b/,
      /\bcork board\b/,
      /\bvent filters?\b/,
      /\bdecor\b/,
    ])
  ) {
    return { categoryName: CATEGORY_TARGETS.homeGoods.name, source: 'title-rule' };
  }

  return { categoryName: CATEGORY_TARGETS.shopping.name, source: 'physical-fallback' };
}

function groupByCategoryName(
  categories: ItemCategoryResolution[],
  items: AmazonChargeItem[],
  totalAmountCents: number,
): AmazonCategoryBreakdown[] {
  const grouped = new Map<string, { basisAmountCents: number; itemTitles: string[] }>();

  categories.forEach((resolution, index) => {
    if (!resolution.categoryName) {
      return;
    }

    const group = grouped.get(resolution.categoryName) ?? {
      basisAmountCents: 0,
      itemTitles: [],
    };
    group.basisAmountCents += items[index]?.basisAmountCents ?? 0;
    group.itemTitles.push(items[index]?.productName ?? '(Unknown item)');
    grouped.set(resolution.categoryName, group);
  });

  return allocateCategorySplitCents(
    totalAmountCents,
    [...grouped.entries()].map(([categoryName, value]) => ({
      categoryName,
      basisAmountCents: value.basisAmountCents,
      itemTitles: value.itemTitles,
    })),
  );
}

function classifyChargeEvent(
  event: AmazonChargeEvent,
  overrides: AmazonCategoryOverridesFile,
): ChargeClassification {
  const resolutions = event.items.map((item) =>
    resolveCategoryForItem(item, event.orderId, overrides),
  );

  if (resolutions.some((resolution) => resolution.categoryName == null)) {
    return {
      status: 'manual-review',
      categoryName: null,
      split: [],
      source: 'item-resolution',
      reason: 'Matched Amazon charge contains at least one item without a confident category.',
    };
  }

  const split = groupByCategoryName(resolutions, event.items, -Math.abs(event.amountCents));

  if (split.length === 0) {
    return {
      status: 'manual-review',
      categoryName: null,
      split: [],
      source: 'split-allocation',
      reason: 'Matched Amazon charge could not be allocated across categories.',
    };
  }

  if (split.length === 1) {
    return {
      status: 'direct',
      categoryName: split[0].categoryName,
      split,
      source: resolutions[0]?.source ?? 'item-resolution',
      reason: null,
    };
  }

  return {
    status: 'split',
    categoryName: null,
    split,
    source: 'split-allocation',
    reason: null,
  };
}

function classifyRefundEvent(
  event: AmazonRefundEvent,
  chargeEventsByOrderId: Map<string, AmazonChargeEvent[]>,
  overrides: AmazonCategoryOverridesFile,
): RefundClassification {
  const orderChargeEvents = chargeEventsByOrderId.get(event.orderId) ?? [];

  if (orderChargeEvents.length === 0) {
    return {
      status: 'manual-review',
      categoryName: null,
      source: 'refund-link',
      reason: 'Refund order has no corresponding Amazon charge event in the export.',
    };
  }

  const exactChargeMatches = orderChargeEvents.filter(
    (chargeEvent) => chargeEvent.amountCents === event.amountCents,
  );

  if (exactChargeMatches.length === 1) {
    const classification = classifyChargeEvent(exactChargeMatches[0], overrides);

    if (classification.status === 'direct' && classification.categoryName) {
      return {
        status: 'direct',
        categoryName: classification.categoryName,
        source: 'refund-charge-match',
        reason: null,
      };
    }
  }

  const allResolvedCategories = new Set<string>();

  for (const chargeEvent of orderChargeEvents) {
    for (const item of chargeEvent.items) {
      const resolution = resolveCategoryForItem(item, chargeEvent.orderId, overrides);

      if (resolution.categoryName) {
        allResolvedCategories.add(resolution.categoryName);
      }
    }
  }

  if (allResolvedCategories.size === 1) {
    return {
      status: 'direct',
      categoryName: [...allResolvedCategories][0],
      source: 'refund-single-category-order',
      reason: null,
    };
  }

  return {
    status: 'manual-review',
    categoryName: null,
    source: 'refund-ambiguity',
    reason: 'Refund maps to an order with multiple possible categories.',
  };
}

function resolveConfiguredAccountName(reference: string, accounts: Account[]): string | null {
  const trimmed = reference.trim();

  if (!trimmed) {
    return null;
  }

  const account = accounts.find(
    (candidate) => candidate.id === trimmed || candidate.name === trimmed,
  );
  return account?.name ?? null;
}

function buildChargeCandidateMap(
  transactions: Transaction[],
  events: AmazonChargeEvent[],
  paymentMethodAccountNames: Record<string, string>,
): Map<string, AmazonChargeEvent[]> {
  const candidates = new Map<string, AmazonChargeEvent[]>();

  for (const transaction of transactions) {
    const exactCandidates = events.filter((event) => {
      if (Math.abs(transaction.amount) !== event.amountCents) {
        return false;
      }

      if (diffInDays(transaction.date, event.eventDate) > MATCH_WINDOW_DAYS) {
        return false;
      }

      if (!event.paymentMethodType) {
        return true;
      }

      const mappedAccountName = paymentMethodAccountNames[event.paymentMethodType];
      return mappedAccountName == null || mappedAccountName === transaction.account_name;
    });

    candidates.set(transaction.id, exactCandidates);
  }

  return candidates;
}

function buildRefundCandidateMap(
  transactions: Transaction[],
  events: AmazonRefundEvent[],
): Map<string, AmazonRefundEvent[]> {
  const candidates = new Map<string, AmazonRefundEvent[]>();

  for (const transaction of transactions) {
    const exactCandidates = events.filter(
      (event) =>
        transaction.amount === event.amountCents &&
        diffInDays(transaction.date, event.eventDate) <= MATCH_WINDOW_DAYS,
    );
    candidates.set(transaction.id, exactCandidates);
  }

  return candidates;
}

function resolveExactUniquePairs<T extends AmazonEvent>(
  transactions: Transaction[],
  candidateMap: Map<string, T[]>,
): Map<string, T> {
  const eventToTransactionIds = new Map<string, string[]>();

  for (const transaction of transactions) {
    const candidates = candidateMap.get(transaction.id) ?? [];

    for (const candidate of candidates) {
      const existing = eventToTransactionIds.get(candidate.id) ?? [];
      existing.push(transaction.id);
      eventToTransactionIds.set(candidate.id, existing);
    }
  }

  const resolved = new Map<string, T>();

  for (const transaction of transactions) {
    const candidates = candidateMap.get(transaction.id) ?? [];

    if (candidates.length !== 1) {
      continue;
    }

    const [candidate] = candidates;
    const candidateTransactionIds = eventToTransactionIds.get(candidate.id) ?? [];

    if (candidateTransactionIds.length === 1) {
      resolved.set(transaction.id, candidate);
    }
  }

  return resolved;
}

export function inferPaymentMethodMappings(
  resolvedPairs: Map<string, AmazonChargeEvent>,
  transactionsById: Map<string, Transaction>,
  accounts: Account[],
  overrides: AmazonPaymentMethodOverridesFile,
): {
  mappings: Record<string, { accountName: string; source: 'seed' | 'derived' | 'override' }>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const resolved: Record<string, { accountName: string; source: 'seed' | 'derived' | 'override' }> =
    {};

  for (const [paymentMethod, accountName] of Object.entries(SEEDED_PAYMENT_METHOD_ACCOUNT_NAMES)) {
    resolved[paymentMethod] = { accountName, source: 'seed' };
  }

  const derivedCounts = new Map<string, Map<string, number>>();

  for (const [transactionId, event] of resolvedPairs) {
    if (!event.paymentMethodType) {
      continue;
    }

    const transaction = transactionsById.get(transactionId);

    if (!transaction?.account_name) {
      continue;
    }

    const accountCounts = derivedCounts.get(event.paymentMethodType) ?? new Map<string, number>();
    accountCounts.set(
      transaction.account_name,
      (accountCounts.get(transaction.account_name) ?? 0) + 1,
    );
    derivedCounts.set(event.paymentMethodType, accountCounts);
  }

  for (const [paymentMethod, counts] of derivedCounts) {
    if (counts.size !== 1) {
      continue;
    }

    const [accountName] = [...counts.keys()];
    resolved[paymentMethod] = { accountName, source: 'derived' };
  }

  for (const [paymentMethod, reference] of Object.entries(overrides.paymentMethods ?? {})) {
    const accountName = resolveConfiguredAccountName(reference, accounts);

    if (!accountName) {
      warnings.push(
        `Payment override for "${paymentMethod}" references unknown account "${reference}".`,
      );
      continue;
    }

    resolved[paymentMethod] = { accountName, source: 'override' };
  }

  return { mappings: resolved, warnings };
}

function transactionSnapshot(transaction: Transaction): CurrentTransactionSnapshot {
  return {
    id: transaction.id,
    date: transaction.date,
    amountCents: transaction.amount,
    payeeName: summarizePayeeName(transaction),
    categoryName: transaction.category_name ?? null,
    isParent: Boolean(transaction.is_parent),
    isChild: Boolean(transaction.is_child),
    transferId: transaction.transfer_id ?? null,
  };
}

export function buildAmazonAudit(input: BuildAmazonAuditInput): AmazonAuditFile {
  const paths = input.paths ?? resolveAmazonWorkspacePaths();
  const warnings: string[] = [];
  const categoryOverrides = input.categoryOverrides ?? {};
  const paymentMethodOverrides = input.paymentMethodOverrides ?? {};

  const allChargeEvents = [
    ...buildPhysicalChargeEvents(input.exportData.orderHistoryRows),
    ...buildDigitalChargeEvents(input.exportData.digitalOrderRows),
  ];
  const refundEvents = buildRefundEvents(input.exportData.refundDetailsRows);
  const chargeEventsByOrderId = new Map<string, AmazonChargeEvent[]>();

  for (const event of allChargeEvents) {
    const existing = chargeEventsByOrderId.get(event.orderId) ?? [];
    existing.push(event);
    chargeEventsByOrderId.set(event.orderId, existing);
  }

  const amazonTransactions = input.transactions.filter(isAmazonTransaction).map((transaction) => ({
    ...transaction,
    account_name:
      transaction.account_name ||
      input.accounts.find((account) => account.id === transaction.account)?.name ||
      transaction.account,
  }));

  const chargeTransactions = amazonTransactions.filter((transaction) => transaction.amount < 0);
  const refundTransactions = amazonTransactions.filter((transaction) => transaction.amount > 0);
  const transactionsById = new Map(
    amazonTransactions.map((transaction) => [transaction.id, transaction]),
  );

  const initialChargeCandidateMap = buildChargeCandidateMap(
    chargeTransactions,
    allChargeEvents,
    {},
  );
  const initialResolvedChargePairs = resolveExactUniquePairs(
    chargeTransactions,
    initialChargeCandidateMap,
  );
  const inferredPaymentMappings = inferPaymentMethodMappings(
    initialResolvedChargePairs,
    transactionsById,
    input.accounts,
    paymentMethodOverrides,
  );
  warnings.push(...inferredPaymentMappings.warnings);

  const chargeCandidateMap = buildChargeCandidateMap(
    chargeTransactions,
    allChargeEvents,
    Object.fromEntries(
      Object.entries(inferredPaymentMappings.mappings).map(([paymentMethod, value]) => [
        paymentMethod,
        value.accountName,
      ]),
    ),
  );
  const resolvedChargePairs = resolveExactUniquePairs(chargeTransactions, chargeCandidateMap);

  const refundCandidateMap = buildRefundCandidateMap(refundTransactions, refundEvents);
  const resolvedRefundPairs = resolveExactUniquePairs(refundTransactions, refundCandidateMap);

  const matches: AmazonAuditMatch[] = [];
  const manualReviews: AmazonManualReviewRecord[] = [];

  for (const transaction of amazonTransactions) {
    const snapshot = transactionSnapshot(transaction);

    if (snapshot.isChild || snapshot.isParent || snapshot.transferId) {
      manualReviews.push({
        transactionId: snapshot.id,
        transactionDate: snapshot.date,
        transactionAmountCents: snapshot.amountCents,
        accountId: transaction.account,
        accountName: transaction.account_name || transaction.account,
        payeeName: snapshot.payeeName,
        currentCategoryName: snapshot.categoryName,
        reason: 'Existing split or transfer transaction requires manual review.',
        candidateOrderIds: [],
        candidatePaymentMethods: [],
        candidateEventDates: [],
      });
      continue;
    }

    if (transaction.amount < 0) {
      const matchedEvent = resolvedChargePairs.get(transaction.id);

      if (!matchedEvent) {
        const candidates = chargeCandidateMap.get(transaction.id) ?? [];
        manualReviews.push({
          transactionId: transaction.id,
          transactionDate: transaction.date,
          transactionAmountCents: transaction.amount,
          accountId: transaction.account,
          accountName: transaction.account_name || transaction.account,
          payeeName: summarizePayeeName(transaction),
          currentCategoryName: transaction.category_name ?? null,
          reason:
            candidates.length === 0
              ? 'No exact Amazon order charge candidate matched this transaction.'
              : 'Multiple exact Amazon order charge candidates matched this transaction.',
          candidateOrderIds: [...new Set(candidates.map((candidate) => candidate.orderId))],
          candidatePaymentMethods: [
            ...new Set(
              candidates
                .map((candidate) => candidate.paymentMethodType)
                .filter((candidate): candidate is string => candidate != null),
            ),
          ],
          candidateEventDates: [...new Set(candidates.map((candidate) => candidate.eventDate))],
        });
        continue;
      }

      const classification = classifyChargeEvent(matchedEvent, categoryOverrides);

      if (classification.status === 'manual-review') {
        manualReviews.push({
          transactionId: transaction.id,
          transactionDate: transaction.date,
          transactionAmountCents: transaction.amount,
          accountId: transaction.account,
          accountName: transaction.account_name || transaction.account,
          payeeName: summarizePayeeName(transaction),
          currentCategoryName: transaction.category_name ?? null,
          reason:
            classification.reason ??
            'Matched Amazon order could not be mapped to a confident category recommendation.',
          candidateOrderIds: [matchedEvent.orderId],
          candidatePaymentMethods: matchedEvent.paymentMethodType
            ? [matchedEvent.paymentMethodType]
            : [],
          candidateEventDates: [matchedEvent.eventDate],
        });
        continue;
      }

      const recommendedCategoryName =
        classification.status === 'direct' ? classification.categoryName : null;
      const alreadyAligned =
        classification.status === 'direct' &&
        recommendedCategoryName != null &&
        transaction.category_name === recommendedCategoryName;

      matches.push({
        transactionId: transaction.id,
        transactionDate: transaction.date,
        transactionAmountCents: transaction.amount,
        accountId: transaction.account,
        accountName: transaction.account_name || transaction.account,
        payeeName: summarizePayeeName(transaction),
        currentCategoryName: transaction.category_name ?? null,
        eventKind: matchedEvent.kind,
        orderId: matchedEvent.orderId,
        eventDate: matchedEvent.eventDate,
        paymentMethodType: matchedEvent.paymentMethodType,
        status:
          classification.status === 'split'
            ? 'ready-split'
            : alreadyAligned
              ? 'already-aligned'
              : 'ready-direct',
        recommendedCategoryName,
        recommendedSplit: classification.split,
        categorySource: classification.source,
        itemSummary: matchedEvent.items.map((item) => item.productName),
        matchedBy: 'exact-unique',
      });
      continue;
    }

    const matchedRefund = resolvedRefundPairs.get(transaction.id);

    if (!matchedRefund) {
      const candidates = refundCandidateMap.get(transaction.id) ?? [];
      manualReviews.push({
        transactionId: transaction.id,
        transactionDate: transaction.date,
        transactionAmountCents: transaction.amount,
        accountId: transaction.account,
        accountName: transaction.account_name || transaction.account,
        payeeName: summarizePayeeName(transaction),
        currentCategoryName: transaction.category_name ?? null,
        reason:
          candidates.length === 0
            ? 'No exact Amazon refund candidate matched this transaction.'
            : 'Multiple exact Amazon refund candidates matched this transaction.',
        candidateOrderIds: [...new Set(candidates.map((candidate) => candidate.orderId))],
        candidatePaymentMethods: [],
        candidateEventDates: [...new Set(candidates.map((candidate) => candidate.eventDate))],
      });
      continue;
    }

    const classification = classifyRefundEvent(
      matchedRefund,
      chargeEventsByOrderId,
      categoryOverrides,
    );

    if (classification.status === 'manual-review' || !classification.categoryName) {
      manualReviews.push({
        transactionId: transaction.id,
        transactionDate: transaction.date,
        transactionAmountCents: transaction.amount,
        accountId: transaction.account,
        accountName: transaction.account_name || transaction.account,
        payeeName: summarizePayeeName(transaction),
        currentCategoryName: transaction.category_name ?? null,
        reason:
          classification.reason ??
          'Matched Amazon refund could not be mapped to a single category recommendation.',
        candidateOrderIds: [matchedRefund.orderId],
        candidatePaymentMethods: [],
        candidateEventDates: [matchedRefund.eventDate],
      });
      continue;
    }

    matches.push({
      transactionId: transaction.id,
      transactionDate: transaction.date,
      transactionAmountCents: transaction.amount,
      accountId: transaction.account,
      accountName: transaction.account_name || transaction.account,
      payeeName: summarizePayeeName(transaction),
      currentCategoryName: transaction.category_name ?? null,
      eventKind: matchedRefund.kind,
      orderId: matchedRefund.orderId,
      eventDate: matchedRefund.eventDate,
      paymentMethodType: null,
      status:
        transaction.category_name === classification.categoryName
          ? 'already-aligned'
          : 'ready-direct',
      recommendedCategoryName: classification.categoryName,
      recommendedSplit: [
        {
          categoryName: classification.categoryName,
          amountCents: transaction.amount,
          itemCount: 1,
          itemTitles: [`Refund for order ${matchedRefund.orderId}`],
        },
      ],
      categorySource: classification.source,
      itemSummary: [`Refund: ${matchedRefund.reason}`],
      matchedBy: 'exact-unique',
    });
  }

  const categoryRecommendationCounts = new Map<string, number>();

  for (const match of matches) {
    if (match.status === 'ready-direct' && match.recommendedCategoryName) {
      categoryRecommendationCounts.set(
        match.recommendedCategoryName,
        (categoryRecommendationCounts.get(match.recommendedCategoryName) ?? 0) + 1,
      );
      continue;
    }

    if (match.status === 'ready-split') {
      for (const split of match.recommendedSplit) {
        categoryRecommendationCounts.set(
          split.categoryName,
          (categoryRecommendationCounts.get(split.categoryName) ?? 0) + 1,
        );
      }
    }
  }

  return {
    version: AMAZON_ANALYSIS_VERSION,
    createdAt: new Date().toISOString(),
    budgetStartDate: input.budgetStartDate,
    workspace: {
      amazonDataDir: paths.amazonDataDir,
      zipPath: paths.zipPath,
      auditPath: paths.auditPath,
      linksPath: paths.linksPath,
      manualReviewPath: paths.manualReviewPath,
      paymentMethodOverridesPath: paths.paymentMethodOverridesPath,
      categoryOverridesPath: paths.categoryOverridesPath,
    },
    summary: {
      totalAmazonTransactions: amazonTransactions.length,
      totalAmazonChargeTransactions: chargeTransactions.length,
      totalAmazonRefundTransactions: refundTransactions.length,
      autoMatchedTransactionCount: matches.length,
      directUpdateCount: matches.filter((match) => match.status === 'ready-direct').length,
      splitUpdateCount: matches.filter((match) => match.status === 'ready-split').length,
      alreadyAlignedCount: matches.filter((match) => match.status === 'already-aligned').length,
      manualReviewCount: manualReviews.length,
      physicalChargeEventCount: allChargeEvents.filter((event) => event.kind === 'physical-charge')
        .length,
      digitalChargeEventCount: allChargeEvents.filter((event) => event.kind === 'digital-charge')
        .length,
      refundEventCount: refundEvents.length,
      categoryRecommendationCounts: [...categoryRecommendationCounts.entries()]
        .map(([categoryName, transactionCount]) => ({ categoryName, transactionCount }))
        .sort((left, right) => right.transactionCount - left.transactionCount),
    },
    paymentMethodMappings: inferredPaymentMappings.mappings,
    warnings,
    matches: matches.sort((left, right) =>
      left.transactionDate.localeCompare(right.transactionDate),
    ),
    manualReviews: manualReviews.sort((left, right) =>
      left.transactionDate.localeCompare(right.transactionDate),
    ),
  };
}

async function ensureJsonFile<T>(path: string, defaultValue: T): Promise<T> {
  await mkdir(dirname(path), { recursive: true });

  if (!existsSync(path)) {
    await writeFile(path, `${JSON.stringify(defaultValue, null, 2)}\n`, 'utf8');
    return defaultValue;
  }

  const contents = await readFile(path, 'utf8');
  return JSON.parse(contents) as T;
}

async function writeAuditOutputs(
  audit: AmazonAuditFile,
  paths: AmazonWorkspacePaths,
): Promise<void> {
  await mkdir(paths.amazonDataDir, { recursive: true });
  await writeFile(paths.auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

  const linksCsv = stringifyCsv(
    audit.matches.map((match) => ({
      transactionId: match.transactionId,
      accountName: match.accountName,
      transactionDate: match.transactionDate,
      amount: (match.transactionAmountCents / 100).toFixed(2),
      payeeName: match.payeeName,
      currentCategoryName: match.currentCategoryName ?? '',
      status: match.status,
      recommendedCategoryName: match.recommendedCategoryName ?? '',
      recommendedSplit: match.recommendedSplit
        .map((split) => `${split.categoryName}: ${(split.amountCents / 100).toFixed(2)}`)
        .join(' | '),
      eventKind: match.eventKind,
      orderId: match.orderId,
      eventDate: match.eventDate,
      paymentMethodType: match.paymentMethodType ?? '',
      categorySource: match.categorySource,
      itemSummary: match.itemSummary.join(' | '),
    })),
    { header: true },
  );
  await writeFile(paths.linksPath, linksCsv, 'utf8');

  const manualReviewCsv = stringifyCsv(
    audit.manualReviews.map((review) => ({
      transactionId: review.transactionId,
      accountName: review.accountName,
      transactionDate: review.transactionDate,
      amount: (review.transactionAmountCents / 100).toFixed(2),
      payeeName: review.payeeName,
      currentCategoryName: review.currentCategoryName ?? '',
      reason: review.reason,
      candidateOrderIds: review.candidateOrderIds.join(' | '),
      candidatePaymentMethods: review.candidatePaymentMethods.join(' | '),
      candidateEventDates: review.candidateEventDates.join(' | '),
    })),
    { header: true },
  );
  await writeFile(paths.manualReviewPath, manualReviewCsv, 'utf8');
}

export async function generateAmazonAudit(
  paths = resolveAmazonWorkspacePaths(),
): Promise<AmazonAuditFile> {
  const paymentMethodOverrides = await ensureJsonFile<AmazonPaymentMethodOverridesFile>(
    paths.paymentMethodOverridesPath,
    { paymentMethods: {} },
  );
  const categoryOverrides = await ensureJsonFile<AmazonCategoryOverridesFile>(
    paths.categoryOverridesPath,
    { orderIds: {}, asins: {}, normalizedTitles: {} },
  );

  const accounts = await fetchAllAccounts();
  const { transactions } = await fetchAllOnBudgetTransactionsWithMetadata(
    accounts,
    ALL_HISTORY_START_DATE,
    FAR_FUTURE_DATE,
  );
  const budgetStartDate = transactions
    .map((transaction) => transaction.date)
    .sort((left, right) => left.localeCompare(right))[0];

  if (!budgetStartDate) {
    throw new Error('Unable to determine budget start date from existing transactions.');
  }

  const exportData = await loadAmazonExportDataFromZip(paths.zipPath, budgetStartDate);
  const audit = buildAmazonAudit({
    accounts,
    transactions,
    exportData,
    budgetStartDate,
    paymentMethodOverrides,
    categoryOverrides,
    paths,
  });

  await writeAuditOutputs(audit, paths);
  return audit;
}

function buildCurrentTransactionMap(
  transactions: Transaction[],
): Map<string, CurrentTransactionSnapshot> {
  return new Map(
    transactions.map((transaction) => [transaction.id, transactionSnapshot(transaction)]),
  );
}

function ensureCategoryByName(
  categoryName: string,
  categoriesByName: Map<string, Category>,
  groupsByName: Map<string, CategoryGroup>,
): { create: false; categoryId: string } | { create: true; groupId: string } {
  const existing = categoriesByName.get(categoryName);

  if (existing) {
    return { create: false, categoryId: existing.id };
  }

  const target = Object.values(CATEGORY_TARGETS).find(
    (candidate) => candidate.name === categoryName,
  ) as CategoryTargetConfig | undefined;

  if (!target?.groupName) {
    throw new Error(
      `Category "${categoryName}" does not exist in the budget and has no group target.`,
    );
  }

  const group = groupsByName.get(target.groupName);

  if (!group) {
    throw new Error(`Required category group "${target.groupName}" was not found in the budget.`);
  }

  return { create: true, groupId: group.id };
}

export async function applyAmazonAudit(
  paths = resolveAmazonWorkspacePaths(),
): Promise<AmazonApplyResult> {
  const audit = JSON.parse(await readFile(paths.auditPath, 'utf8')) as AmazonAuditFile;

  if (audit.version !== AMAZON_ANALYSIS_VERSION) {
    throw new Error(
      `Unsupported Amazon audit version ${audit.version}. Expected ${AMAZON_ANALYSIS_VERSION}.`,
    );
  }

  const accounts = await fetchAllAccounts();
  const { transactions } = await fetchAllOnBudgetTransactionsWithMetadata(
    accounts,
    ALL_HISTORY_START_DATE,
    FAR_FUTURE_DATE,
  );
  const currentTransactionsById = buildCurrentTransactionMap(transactions);
  const [categories, groups] = await Promise.all([getCategories(), getCategoryGroups()]);
  const categoriesByName = new Map(
    categories.map((category) => [category.name, category as Category]),
  );
  const groupsByName = new Map(groups.map((group) => [group.name, group as CategoryGroup]));

  const categoriesCreated: string[] = [];
  const targetCategoryNames = new Set<string>();

  for (const match of audit.matches) {
    if (match.status === 'ready-direct' && match.recommendedCategoryName) {
      targetCategoryNames.add(match.recommendedCategoryName);
    }

    if (match.status === 'ready-split') {
      for (const split of match.recommendedSplit) {
        targetCategoryNames.add(split.categoryName);
      }
    }
  }

  for (const categoryName of targetCategoryNames) {
    const resolution = ensureCategoryByName(categoryName, categoriesByName, groupsByName);

    if (!resolution.create) {
      continue;
    }

    const createdCategoryId = await createCategory({
      name: categoryName,
      group_id: resolution.groupId,
    });
    categoriesByName.set(categoryName, {
      id: createdCategoryId,
      name: categoryName,
      group_id: resolution.groupId,
    });
    categoriesCreated.push(categoryName);
  }

  let directUpdatesApplied = 0;
  let splitUpdatesApplied = 0;
  let skippedAlreadyAligned = 0;
  let skippedMissingTransactions = 0;
  let skippedChangedTransactions = 0;

  for (const match of audit.matches) {
    if (match.status === 'already-aligned') {
      skippedAlreadyAligned += 1;
      continue;
    }

    const current = currentTransactionsById.get(match.transactionId);

    if (!current) {
      skippedMissingTransactions += 1;
      continue;
    }

    if (
      current.date !== match.transactionDate ||
      current.amountCents !== match.transactionAmountCents ||
      current.payeeName !== match.payeeName ||
      current.isChild ||
      current.isParent ||
      current.transferId
    ) {
      skippedChangedTransactions += 1;
      continue;
    }

    if (match.status === 'ready-direct') {
      const categoryId = categoriesByName.get(match.recommendedCategoryName ?? '')?.id;

      if (!categoryId) {
        skippedChangedTransactions += 1;
        continue;
      }

      await updateTransaction(match.transactionId, {
        category: categoryId,
        subtransactions: undefined,
      });
      directUpdatesApplied += 1;
      continue;
    }

    const splitSubtransactions = match.recommendedSplit.map((split) => {
      const categoryId = categoriesByName.get(split.categoryName)?.id;

      if (!categoryId) {
        throw new Error(`Split target category "${split.categoryName}" was not found.`);
      }

      return {
        amount: split.amountCents,
        category: categoryId,
        notes: `Amazon: ${split.itemTitles.slice(0, 3).join(' | ')}`,
      };
    });

    await updateTransaction(match.transactionId, {
      category: null,
      subtransactions: splitSubtransactions,
    });
    splitUpdatesApplied += 1;
  }

  return {
    categoriesCreated,
    directUpdatesApplied,
    splitUpdatesApplied,
    skippedAlreadyAligned,
    skippedMissingTransactions,
    skippedChangedTransactions,
  };
}
