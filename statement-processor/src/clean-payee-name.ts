/**
 * Payee Cleaner - Extract clean, readable payee names from Chase descriptions
 */

import { CleanedPayee } from './types.js';

/**
 * Clean a payee name from a Chase transaction description
 * 
 * @param description - Full transaction description from Chase CSV
 * @param type - Transaction type (ACH_DEBIT, MISC_CREDIT, etc.)
 * @returns CleanedPayee object with payee name and notes
 */
export function cleanPayeeName(description: string, type: string): CleanedPayee {
  if (!description || description.trim() === '') {
    return {
      payee: 'Unknown',
      notes: '',
    };
  }

  const trimmedDescription = description.trim();

  // Handle very long descriptions (truncate payee, keep full in notes)
  const MAX_PAYEE_LENGTH = 100;
  
  // Handle special cases first (before any text manipulation)
  const specialCase = handleSpecialCases(trimmedDescription, type);
  if (specialCase) {
    return {
      payee: specialCase.payee,
      notes: specialCase.notes,
    };
  }

  // Handle recurring payment merchants (before text manipulation)
  const recurringCase = handleRecurringMerchants(trimmedDescription);
  if (recurringCase) {
    // Still extract reference IDs for recurring merchants
    const { extractedIds } = extractReferenceIds(trimmedDescription);
    return {
      payee: recurringCase.payee,
      notes: combineNotes(extractedIds, '', trimmedDescription),
    };
  }

  // Extract payee and notes
  let payee = trimmedDescription;
  let notes = '';

  // Extract reference IDs and move to notes
  const { cleanedText, extractedIds } = extractReferenceIds(trimmedDescription);
  payee = cleanedText;
  notes = extractedIds;

  // Remove payment processing keywords
  payee = removePaymentKeywords(payee);

  // Normalize whitespace and formatting
  payee = normalizeWhitespace(payee);

  // Truncate if too long
  if (payee.length > MAX_PAYEE_LENGTH) {
    payee = payee.substring(0, MAX_PAYEE_LENGTH).trim() + '...';
  }

  // If payee is empty after cleaning, use a fallback
  if (payee === '' || payee === '...') {
    payee = 'Unknown';
  }

  return {
    payee,
    notes: combineNotes('', notes, trimmedDescription),
  };
}

/**
 * Extract reference IDs (PPD ID, WEB ID, CTX ID) from description
 * Returns cleaned text and extracted IDs
 */
function extractReferenceIds(description: string): { cleanedText: string; extractedIds: string } {
  const ids: string[] = [];
  let cleanedText = description;

  // Pattern to match reference IDs
  const idPatterns = [
    /PPD ID:\s*[\w\d]+/gi,
    /WEB ID:\s*[\w\d]+/gi,
    /CTX ID:\s*[\w\d]+/gi,
  ];

  for (const pattern of idPatterns) {
    const matches = cleanedText.match(pattern);
    if (matches) {
      ids.push(...matches);
      cleanedText = cleanedText.replace(pattern, '').trim();
    }
  }

  return {
    cleanedText,
    extractedIds: ids.join(' '),
  };
}

/**
 * Remove payment processing keywords from payee name
 */
function removePaymentKeywords(payee: string): string {
  const keywords = [
    /\bONLINE\s+PAYMENT\b/gi,
    /\bONLINE\s+PMT\b/gi,
    /\bAUTO\s+PAY\b/gi,
    /\bPAYMENT\b/gi,
    /\bAUTOPAY\b/gi,
    /\bONLINE\b/gi,
  ];

  let cleaned = payee;
  for (const keyword of keywords) {
    cleaned = cleaned.replace(keyword, '').trim();
  }

  return cleaned;
}

/**
 * Handle special cases like Zelle and account transfers
 */
function handleSpecialCases(description: string, type: string): CleanedPayee | null {
  // Zelle payment to someone
  // Extract recipient name and remove confirmation codes
  const zelleToMatch = description.match(/Zelle\s+payment\s+to\s+(.+?)(?:\s+Conf#|$)/i);
  if (zelleToMatch) {
    const recipient = zelleToMatch[1].trim();
    return {
      payee: recipient,
      notes: description,
    };
  }

  // Zelle payment from someone
  // Extract sender name and remove confirmation codes
  const zelleFromMatch = description.match(/Zelle\s+payment\s+from\s+(.+?)(?:\s+Conf#|$)/i);
  if (zelleFromMatch) {
    const sender = zelleFromMatch[1].trim();
    return {
      payee: sender,
      notes: description,
    };
  }

  // Account transfers
  // Format as "Transfer: [Account Name]" to clearly indicate transfer type
  if (type === 'ACCT_XFER' || description.toLowerCase().includes('transfer')) {
    // Try to extract account name or type from description
    const transferMatch = description.match(/(?:to|from)\s+(.+?)(?:\s+\d+|$)/i);
    if (transferMatch) {
      const accountName = transferMatch[1].trim();
      return {
        payee: `Transfer: ${accountName}`,
        notes: description,
      };
    }
    return {
      payee: 'Account Transfer',
      notes: description,
    };
  }

  // Check deposits
  if (type === 'CHECK_DEPOSIT' || description.toLowerCase().includes('check deposit')) {
    return {
      payee: 'Check Deposit',
      notes: description,
    };
  }

  return null;
}

/**
 * Handle recurring payment merchants with specific cleaning rules
 */
function handleRecurringMerchants(description: string): CleanedPayee | null {
  // Robinhood Card
  if (description.includes('Robinhood Card')) {
    return {
      payee: 'Robinhood Card',
      notes: description,
    };
  }

  // Apple Card GSBANK
  if (description.includes('APPLECARD GSBANK')) {
    return {
      payee: 'Apple Card',
      notes: description,
    };
  }

  // Grande Communications
  if (description.includes('GRANDE COMMUNICA')) {
    return {
      payee: 'Grande Communications',
      notes: description,
    };
  }

  // Bilt Payments
  if (description.includes('BILTPYMTS')) {
    return {
      payee: 'Bilt Payments',
      notes: description,
    };
  }

  return null;
}

/**
 * Normalize whitespace in payee name
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

/**
 * Combine notes fields, avoiding duplication
 */
function combineNotes(specialNotes: string, extractedIds: string, originalDescription: string): string {
  const parts: string[] = [];

  if (extractedIds) {
    parts.push(extractedIds);
  }

  // Always include original description for reference
  if (originalDescription && !parts.includes(originalDescription)) {
    parts.push(originalDescription);
  }

  if (specialNotes && specialNotes !== originalDescription && !parts.includes(specialNotes)) {
    parts.push(specialNotes);
  }

  return parts.join(' | ');
}
