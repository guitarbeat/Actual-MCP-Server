import { NameResolver } from './name-resolver.js';
import { fetchAllAccounts } from '../data/fetch-accounts.js';
import { vi } from 'vitest';

// We can't easily mock in a standalone script without vitest/jest.
// Let's just create a mock implementation by overriding the import, or just running it via vitest.
