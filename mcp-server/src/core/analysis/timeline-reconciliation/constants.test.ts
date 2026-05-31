import { describe, expect, it } from 'vitest';
import * as Constants from './constants.js';

describe('Timeline Reconciliation Constants', () => {
  it('should define core analysis constants', () => {
    expect(Constants.TIMELINE_ANALYSIS_VERSION).toBeTypeOf('number');
    expect(Constants.TIMELINE_ANALYSIS_VERSION).toBeGreaterThan(0);

    expect(Constants.RECON_START_DATE).toBeTypeOf('string');
    expect(Constants.RECON_START_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expect(Constants.RECON_END_DATE).toBeTypeOf('string');
    expect(Constants.RECON_END_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should define required filenames', () => {
    const filenames = [
      Constants.TIMELINE_RECON_AUDIT_FILENAME,
      Constants.TIMELINE_RECON_CANDIDATES_FILENAME,
      Constants.TIMELINE_RECON_MANUAL_REVIEW_FILENAME,
      Constants.TIMELINE_PLACE_CACHE_FILENAME,
      Constants.TIMELINE_CATEGORY_OVERRIDES_FILENAME,
      Constants.SUPPLEMENTAL_TRANSACTIONS_FILENAME,
      Constants.LOCATION_HISTORY_FILENAME,
    ];

    filenames.forEach((filename) => {
      expect(filename).toBeTypeOf('string');
      expect(filename.length).toBeGreaterThan(0);
    });
  });

  it('should define pseudo-stay configuration', () => {
    expect(Constants.TIMELINE_NOTE_PREFIX).toBeTypeOf('string');
    expect(Constants.MIN_PSEUDO_STAY_MINUTES).toBeTypeOf('number');
    expect(Constants.MAX_PSEUDO_STAY_CLUSTER_DISTANCE_METERS).toBeTypeOf('number');
    expect(Constants.EXACT_MATCH_SHORT_TEXT_LENGTH).toBeTypeOf('number');
    expect(Constants.MIN_HISTORICAL_HINT_COUNT).toBeTypeOf('number');
    expect(Constants.MIN_HISTORICAL_HINT_CONFIDENCE).toBeTypeOf('number');
    expect(Constants.MIN_RULE_CONFIRMATION_COUNT).toBeTypeOf('number');
  });

  describe('Keyword Arrays', () => {
    const keywordArrays: Record<string, string[]> = {
      FAST_FOOD_KEYWORDS: Constants.FAST_FOOD_KEYWORDS,
      DINING_KEYWORDS: Constants.DINING_KEYWORDS,
      GAS_KEYWORDS: Constants.GAS_KEYWORDS,
      RIDESHARE_KEYWORDS: Constants.RIDESHARE_KEYWORDS,
      HOUSEHOLD_KEYWORDS: Constants.HOUSEHOLD_KEYWORDS,
      PET_KEYWORDS: Constants.PET_KEYWORDS,
      BEAUTY_KEYWORDS: Constants.BEAUTY_KEYWORDS,
      MEDICINE_KEYWORDS: Constants.MEDICINE_KEYWORDS,
      HEALTH_INSURANCE_KEYWORDS: Constants.HEALTH_INSURANCE_KEYWORDS,
      INVESTMENT_KEYWORDS: Constants.INVESTMENT_KEYWORDS,
      FEE_KEYWORDS: Constants.FEE_KEYWORDS,
      GOVERNMENT_KEYWORDS: Constants.GOVERNMENT_KEYWORDS,
      EXPERIENCE_KEYWORDS: Constants.EXPERIENCE_KEYWORDS,
      HOME_GOODS_KEYWORDS: Constants.HOME_GOODS_KEYWORDS,
      SHOPPING_KEYWORDS: Constants.SHOPPING_KEYWORDS,
      TECH_KEYWORDS: Constants.TECH_KEYWORDS,
      INELIGIBLE_MERCHANT_PATTERNS: Constants.INELIGIBLE_MERCHANT_PATTERNS,
    };

    Object.entries(keywordArrays).forEach(([name, arr]) => {
      it(`should export a non-empty string array for ${name}`, () => {
        expect(Array.isArray(arr)).toBe(true);
        expect(arr.length).toBeGreaterThan(0);
        arr.forEach((keyword) => {
          expect(keyword).toBeTypeOf('string');
          expect(keyword.length).toBeGreaterThan(0);
        });
      });
    });
  });

  it('should define external category aliases correctly', () => {
    expect(Constants.EXTERNAL_CATEGORY_ALIASES).toBeTypeOf('object');
    expect(Object.keys(Constants.EXTERNAL_CATEGORY_ALIASES).length).toBeGreaterThan(0);

    Object.entries(Constants.EXTERNAL_CATEGORY_ALIASES).forEach(([key, value]) => {
      expect(key).toBeTypeOf('string');
      expect(value).toBeTypeOf('string');
      expect(key.length).toBeGreaterThan(0);
      expect(value.length).toBeGreaterThan(0);
    });
  });
});
