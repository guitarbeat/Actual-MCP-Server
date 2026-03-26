import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { auditUncategorizedTransactions } from '../core/analysis/uncategorized-audit.js';
import { formatAmount } from '../core/formatting/index.js';

export const UNCATEGORIZED_LIST_RESOURCES = [
  {
    uri: 'actual://uncategorized',
    name: 'Uncategorized Audit',
    description: 'Audit uncategorized transactions across all on-budget accounts.',
    mimeType: 'text/markdown',
  },
];

function formatGroupSection(
  title: string,
  groups: Awaited<ReturnType<typeof auditUncategorizedTransactions>>['groups'],
): string {
  if (groups.length === 0) {
    return `## ${title}\n\n_None_\n`;
  }

  const sections = groups.map((group) => {
    const hint = group.historicalCategoryHint
      ? `${group.historicalCategoryHint.categoryName} (${group.historicalCategoryHint.matchingPeerCount}/${group.historicalCategoryHint.categorizedPeerCount}, ${(group.historicalCategoryHint.confidence * 100).toFixed(0)}%)`
      : 'None';
    const relatedRules =
      group.relatedRules.length > 0
        ? group.relatedRules
            .map((rule) => {
              const category =
                rule.categoryActionName || rule.categoryActionValue || 'no category action';
              return `${rule.id} (${rule.ruleMatchType} -> ${category})`;
            })
            .join(', ')
        : 'None';
    const samples = group.sampleTransactions
      .map((sample) => {
        const payee = sample.imported_payee || sample.payee || '(No payee)';
        const notes = sample.notes ? ` / ${sample.notes}` : '';
        return `- ${sample.id} | ${sample.date} | ${payee}${notes}`;
      })
      .join('\n');

    return [
      `### ${group.groupLabel} (${group.accountName})`,
      '',
      `- Count: ${group.uncategorizedCount}`,
      `- Total: ${formatAmount(group.uncategorizedTotalAmount)}`,
      `- Window: ${group.oldestDate} to ${group.newestDate}`,
      `- Suggested action: ${group.suggestedAction}`,
      `- Historical hint: ${hint}`,
      `- Related rules: ${relatedRules}`,
      ...(group.suggestionBlockedReason
        ? [`- Why automation was withheld: ${group.suggestionBlockedReason}`]
        : []),
      '',
      'Sample transactions:',
      samples,
    ].join('\n');
  });

  return [`## ${title}`, '', ...sections].join('\n');
}

export async function handleUncategorizedResource(uri: string): Promise<ReadResourceResult> {
  const result = await auditUncategorizedTransactions();

  if (result.summary.uncategorizedTransactionCount === 0) {
    return {
      contents: [
        {
          uri,
          text: '# Uncategorized Transaction Audit\n\n_No uncategorized transactions found._',
          mimeType: 'text/markdown',
        },
      ],
    };
  }

  const ruleOpportunities = result.groups.filter(
    (group) => group.suggestedAction === 'create-rule' || group.suggestedAction === 'update-rule',
  );
  const manualReviewGroups = result.groups.filter(
    (group) => group.suggestedAction === 'manual-review',
  );
  const warnings =
    result.warnings.length > 0
      ? `## Warnings\n\n${result.warnings.map((warning) => `- ${warning}`).join('\n')}\n`
      : '';

  return {
    contents: [
      {
        uri,
        text: [
          '# Uncategorized Transaction Audit',
          '',
          `- Date range: ${result.summary.startDate} to ${result.summary.endDate}`,
          `- Scope: ${result.summary.accountScope === 'all-on-budget' ? 'All on-budget accounts' : result.summary.accountName || result.summary.accountId || 'Single account'}`,
          `- Uncategorized transactions: ${result.summary.uncategorizedTransactionCount}`,
          `- Uncategorized total: ${formatAmount(result.summary.uncategorizedTransactionTotalAmount)}`,
          `- Grouped clusters shown: ${result.summary.returnedGroupCount} of ${result.summary.totalGroupCount}`,
          `- Rule opportunities: ${result.summary.ruleOpportunityCount}`,
          `- Manual review groups: ${result.summary.manualReviewGroupCount}`,
          '',
          warnings,
          formatGroupSection('Rule Opportunities', ruleOpportunities),
          '',
          formatGroupSection('Manual Review Leftovers', manualReviewGroups),
        ]
          .filter(Boolean)
          .join('\n'),
        mimeType: 'text/markdown',
      },
    ],
  };
}
