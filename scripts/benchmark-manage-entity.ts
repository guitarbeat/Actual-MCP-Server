#!/usr/bin/env tsx
/**
 * Performance benchmark for manage-entity tool
 * Compares performance of consolidated tool vs individual tools
 */

import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';

// Mock the actual-api module for benchmarking
const mockApi = {
  createCategory: async (data: any) => randomUUID(),
  updateCategory: async (id: string, data: any) => {},
  deleteCategory: async (id: string) => {},
  createCategoryGroup: async (data: any) => randomUUID(),
  updateCategoryGroup: async (id: string, data: any) => {},
  deleteCategoryGroup: async (id: string) => {},
  createPayee: async (data: any) => randomUUID(),
  updatePayee: async (id: string, data: any) => {},
  deletePayee: async (id: string) => {},
  createRule: async (data: any) => ({ id: randomUUID() }),
  updateRule: async (data: any) => {},
  deleteRule: async (id: string) => {},
  createSchedule: async (data: any) => randomUUID(),
  updateSchedule: async (id: string, data: any) => {},
  deleteSchedule: async (id: string) => {},
};

// Benchmark configuration
const ITERATIONS = 1000;
const WARMUP_ITERATIONS = 100;

interface BenchmarkResult {
  name: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
  iterations: number;
}

/**
 * Run a benchmark function multiple times and collect statistics
 */
async function benchmark(name: string, fn: () => Promise<void>, iterations: number): Promise<BenchmarkResult> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((sum, t) => sum + t, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return {
    name,
    avgTime,
    minTime,
    maxTime,
    totalTime,
    iterations,
  };
}

/**
 * Simulate old tool pattern (direct API call)
 */
async function oldToolPattern(operation: string, entityType: string, data: any) {
  // Simulate validation overhead
  if (!data) throw new Error('Data required');

  // Direct API call
  switch (entityType) {
    case 'category':
      if (operation === 'create') return await mockApi.createCategory(data);
      if (operation === 'update') return await mockApi.updateCategory(data.id, data);
      if (operation === 'delete') return await mockApi.deleteCategory(data.id);
      break;
    case 'payee':
      if (operation === 'create') return await mockApi.createPayee(data);
      if (operation === 'update') return await mockApi.updatePayee(data.id, data);
      if (operation === 'delete') return await mockApi.deletePayee(data.id);
      break;
  }
}

/**
 * Simulate new manage-entity pattern (with routing)
 */
async function newToolPattern(operation: string, entityType: string, data: any) {
  // Simulate validation overhead
  if (!entityType) throw new Error('Entity type required');
  if (!operation) throw new Error('Operation required');

  // Simulate handler lookup (minimal overhead)
  const handlers: Record<string, any> = {
    category: {
      create: mockApi.createCategory,
      update: mockApi.updateCategory,
      delete: mockApi.deleteCategory,
    },
    payee: {
      create: mockApi.createPayee,
      update: mockApi.updatePayee,
      delete: mockApi.deletePayee,
    },
  };

  const handler = handlers[entityType]?.[operation];
  if (!handler) throw new Error('Invalid entity type or operation');

  // Execute operation
  if (operation === 'delete') {
    return await handler(data.id);
  } else if (operation === 'update') {
    return await handler(data.id, data);
  } else {
    return await handler(data);
  }
}

/**
 * Format benchmark results as a table
 */
function formatResults(results: BenchmarkResult[]): string {
  const lines: string[] = [];

  lines.push('\n┌─────────────────────────────────────────────────────────────────────────┐');
  lines.push('│                    Performance Benchmark Results                       │');
  lines.push('├─────────────────────────────────────────────────────────────────────────┤');
  lines.push('│ Test Case                          │ Avg (ms) │ Min (ms) │ Max (ms)    │');
  lines.push('├────────────────────────────────────┼──────────┼──────────┼─────────────┤');

  for (const result of results) {
    const name = result.name.padEnd(34);
    const avg = result.avgTime.toFixed(3).padStart(8);
    const min = result.minTime.toFixed(3).padStart(8);
    const max = result.maxTime.toFixed(3).padStart(11);
    lines.push(`│ ${name} │ ${avg} │ ${min} │ ${max} │`);
  }

  lines.push('└────────────────────────────────────┴──────────┴──────────┴─────────────┘');

  return lines.join('\n');
}

/**
 * Calculate overhead percentage
 */
function calculateOverhead(oldTime: number, newTime: number): string {
  const overhead = ((newTime - oldTime) / oldTime) * 100;
  const sign = overhead >= 0 ? '+' : '';
  return `${sign}${overhead.toFixed(2)}%`;
}

/**
 * Main benchmark execution
 */
async function main() {
  console.log('🚀 Starting manage-entity performance benchmark...\n');
  console.log(`Configuration:`);
  console.log(`  - Warmup iterations: ${WARMUP_ITERATIONS}`);
  console.log(`  - Benchmark iterations: ${ITERATIONS}`);
  console.log(`  - Operations tested: create, update, delete`);
  console.log(`  - Entity types: category, payee\n`);

  const testData = {
    category: {
      create: { name: 'Test Category', groupId: randomUUID() },
      update: { id: randomUUID(), name: 'Updated Category', groupId: randomUUID() },
      delete: { id: randomUUID() },
    },
    payee: {
      create: { name: 'Test Payee' },
      update: { id: randomUUID(), name: 'Updated Payee' },
      delete: { id: randomUUID() },
    },
  };

  // Warmup
  console.log('⏳ Warming up...');
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    await oldToolPattern('create', 'category', testData.category.create);
    await newToolPattern('create', 'category', testData.category.create);
  }
  console.log('✅ Warmup complete\n');

  // Run benchmarks
  console.log('📊 Running benchmarks...\n');

  const results: BenchmarkResult[] = [];

  // Category operations
  console.log('Testing category operations...');
  results.push(
    await benchmark(
      'Old: create-category',
      () => oldToolPattern('create', 'category', testData.category.create),
      ITERATIONS
    )
  );
  results.push(
    await benchmark(
      'New: manage-entity (category)',
      () => newToolPattern('create', 'category', testData.category.create),
      ITERATIONS
    )
  );

  results.push(
    await benchmark(
      'Old: update-category',
      () => oldToolPattern('update', 'category', testData.category.update),
      ITERATIONS
    )
  );
  results.push(
    await benchmark(
      'New: manage-entity (category)',
      () => newToolPattern('update', 'category', testData.category.update),
      ITERATIONS
    )
  );

  results.push(
    await benchmark(
      'Old: delete-category',
      () => oldToolPattern('delete', 'category', testData.category.delete),
      ITERATIONS
    )
  );
  results.push(
    await benchmark(
      'New: manage-entity (category)',
      () => newToolPattern('delete', 'category', testData.category.delete),
      ITERATIONS
    )
  );

  // Payee operations
  console.log('Testing payee operations...');
  results.push(
    await benchmark('Old: create-payee', () => oldToolPattern('create', 'payee', testData.payee.create), ITERATIONS)
  );
  results.push(
    await benchmark(
      'New: manage-entity (payee)',
      () => newToolPattern('create', 'payee', testData.payee.create),
      ITERATIONS
    )
  );

  // Display results
  console.log(formatResults(results));

  // Calculate and display overhead
  console.log('\n📈 Performance Analysis:\n');

  const categoryCreateOld = results[0].avgTime;
  const categoryCreateNew = results[1].avgTime;
  const categoryUpdateOld = results[2].avgTime;
  const categoryUpdateNew = results[3].avgTime;
  const categoryDeleteOld = results[4].avgTime;
  const categoryDeleteNew = results[5].avgTime;
  const payeeCreateOld = results[6].avgTime;
  const payeeCreateNew = results[7].avgTime;

  console.log(`Category Create:  ${calculateOverhead(categoryCreateOld, categoryCreateNew)} overhead`);
  console.log(`Category Update:  ${calculateOverhead(categoryUpdateOld, categoryUpdateNew)} overhead`);
  console.log(`Category Delete:  ${calculateOverhead(categoryDeleteOld, categoryDeleteNew)} overhead`);
  console.log(`Payee Create:     ${calculateOverhead(payeeCreateOld, payeeCreateNew)} overhead`);

  const avgOldTime = (categoryCreateOld + categoryUpdateOld + categoryDeleteOld + payeeCreateOld) / 4;
  const avgNewTime = (categoryCreateNew + categoryUpdateNew + categoryDeleteNew + payeeCreateNew) / 4;
  const avgOverhead = calculateOverhead(avgOldTime, avgNewTime);

  console.log(`\nAverage Overhead: ${avgOverhead}`);

  // Performance targets
  console.log('\n🎯 Performance Targets:\n');
  const routingOverhead = avgNewTime - avgOldTime;
  const targetOverhead = 5; // 5ms target

  console.log(`  Routing overhead: ${routingOverhead.toFixed(3)}ms`);
  console.log(`  Target overhead:  <${targetOverhead}ms`);

  if (routingOverhead < targetOverhead) {
    console.log(`  ✅ PASS: Overhead is within target (<${targetOverhead}ms)`);
  } else {
    console.log(`  ❌ FAIL: Overhead exceeds target (${routingOverhead.toFixed(3)}ms > ${targetOverhead}ms)`);
  }

  // Memory footprint (approximate)
  console.log('\n💾 Memory Footprint:\n');
  console.log('  Old tools: ~15 handler functions (one per tool)');
  console.log('  New tool:  ~5 handler classes + 1 registry');
  console.log('  Handlers are singletons, so memory footprint is similar');

  console.log('\n✨ Benchmark complete!\n');
}

// Run benchmark
main().catch(console.error);
