# Budget Category Follow-Ups

This note captures the remaining design questions after the lean-control cleanup pass.

## Current direction

- Prefer purpose-based categories over store/vendor categories.
- Keep the category system small enough to reduce decision fatigue.
- Preserve separate buckets only when they support a real workflow, planning habit, or emotionally meaningful distinction.
- Keep bookkeeping categories conceptually separate from lifestyle spending.

## Open questions

1. Food simplification
Bars currently remain separate from eating out.
Question: should all out-of-home food and drink collapse into one category, or should bars stay distinct?

2. Grocery semantics
Groceries remains separate because the data still contains recurring food-at-home merchants.
Question: should this become a broader “food at home” concept, or stay as groceries?

3. Personal care boundary
Personal care is currently separate because item-level purchase history shows a coherent body/appearance pattern.
Question: should it remain a distinct maintenance category, or eventually merge into general shopping?

4. General shopping boundary
General shopping now absorbs former media, tech/electronics, marketplace, and uncategorized Amazon-purpose purchases.
Question: should repairs or small one-off home purchases also eventually move into this bucket, or stay distinct?

5. Money movement visibility
Money movement is now conceptually separated from spending.
Question: should these categories remain visible in the main budget structure, or eventually be treated as a quieter bookkeeping layer?

6. Amazon item routing
Amazon is no longer treated as a purpose category.
Question: should future Amazon cleanup go further by re-routing more historical Amazon transactions into their exact purpose buckets using the local order-history audit?

7. Planning-only placeholders
Some low-activity categories may still exist mainly for planning rather than frequent transaction categorization.
Question: which of those are still useful as deliberate planning placeholders, and which should be retired?

## Guiding rule for future cleanup

When deciding whether to keep a category, ask:

- Does this category change a real budgeting decision?
- Does it map cleanly to how spending feels in the moment?
- Would removing it make categorization faster without losing meaning?

If the answer is “no” to the first two and “yes” to the third, it is probably a merge candidate.
