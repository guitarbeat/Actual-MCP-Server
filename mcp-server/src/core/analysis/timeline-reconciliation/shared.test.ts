import { describe, expect, it } from 'vitest';
import {
  normalizeString,
  normalizeComparisonText,
  normalizeMerchantKey,
  parseMoneyToCents,
  parseProbability,
  parseInteger,
  toLocalDateKey,
  dateKeyToMillis,
  diffCalendarDays,
  isDateRangeOverlapping,
  parseGeoPoint,
  buildMapsSearchUrl,
  buildPlaceKey,
  haversineDistanceMeters,
  meanCoordinate,
  tokenizeForMatching,
  merchantNamesCompatible,
} from './shared.js';

describe('shared utilities', () => {
  describe('normalizeString', () => {
    it('returns null for null/undefined input', () => {
      expect(normalizeString(null)).toBeNull();
      expect(normalizeString(undefined)).toBeNull();
    });

    it('trims whitespace', () => {
      expect(normalizeString('  test  ')).toBe('test');
    });

    it('returns null if string is empty after trimming', () => {
      expect(normalizeString('   ')).toBeNull();
    });
  });

  describe('normalizeComparisonText', () => {
    it('handles null/undefined by treating them as empty string', () => {
      expect(normalizeComparisonText(null)).toBe('');
      expect(normalizeComparisonText(undefined)).toBe('');
    });

    it('normalizes NFKD, replaces non-word chars with spaces, collapses spaces, and lowercases', () => {
      expect(normalizeComparisonText('  Hello_World!  Café   123  ')).toBe('hello_world cafe 123');
    });
  });

  describe('normalizeMerchantKey', () => {
    it('collapses spaces after normalizeComparisonText', () => {
      expect(normalizeMerchantKey("Mc Donald's")).toBe('mc donald s');
    });
  });

  describe('parseMoneyToCents', () => {
    it('parses formatted amounts into cents', () => {
      expect(parseMoneyToCents('1,234.56')).toBe(123456);
      expect(parseMoneyToCents('-10.5')).toBe(-1050);
      expect(parseMoneyToCents('0.00')).toBe(0);
    });

    it('throws on invalid inputs', () => {
      expect(() => parseMoneyToCents('abc')).toThrow('Unable to parse monetary value: abc');
    });
  });

  describe('parseProbability', () => {
    it('returns undefined on falsy input', () => {
      expect(parseProbability(undefined)).toBeUndefined();
      expect(parseProbability('')).toBeUndefined();
    });

    it('parses valid floats', () => {
      expect(parseProbability('0.75')).toBe(0.75);
    });

    it('returns undefined on invalid inputs', () => {
      expect(parseProbability('abc')).toBeUndefined();
    });
  });

  describe('parseInteger', () => {
    it('returns undefined on falsy input', () => {
      expect(parseInteger(undefined)).toBeUndefined();
      expect(parseInteger('')).toBeUndefined();
    });

    it('parses valid integers', () => {
      expect(parseInteger('42')).toBe(42);
      expect(parseInteger('-10')).toBe(-10);
    });

    it('returns undefined on invalid inputs', () => {
      expect(parseInteger('abc')).toBeUndefined();
    });
  });

  describe('toLocalDateKey', () => {
    it('extracts date from valid ISO-like string', () => {
      expect(toLocalDateKey('2023-10-25T12:00:00Z')).toBe('2023-10-25');
      expect(toLocalDateKey('2023-10-25')).toBe('2023-10-25');
    });

    it('returns null on invalid/falsy inputs', () => {
      expect(toLocalDateKey(undefined)).toBeNull();
      expect(toLocalDateKey('invalid')).toBeNull();
    });
  });

  describe('dateKeyToMillis', () => {
    it('parses date string to UTC millis', () => {
      const millis = dateKeyToMillis('2023-10-25');
      expect(millis).toBe(Date.parse('2023-10-25T00:00:00Z'));
    });
  });

  describe('diffCalendarDays', () => {
    it('calculates the day difference correctly', () => {
      expect(diffCalendarDays('2023-10-25', '2023-10-20')).toBe(5);
      expect(diffCalendarDays('2023-10-20', '2023-10-25')).toBe(-5);
      expect(diffCalendarDays('2023-10-25', '2023-10-25')).toBe(0);
    });
  });

  describe('isDateRangeOverlapping', () => {
    it('returns false if startDate or endDate are falsy', () => {
      expect(isDateRangeOverlapping(null, '2023-10-25', '2023-10-20', '2023-10-30')).toBe(false);
      expect(isDateRangeOverlapping('2023-10-20', null, '2023-10-20', '2023-10-30')).toBe(false);
    });

    it('detects overlaps correctly', () => {
      // Complete enclosure
      expect(isDateRangeOverlapping('2023-10-21', '2023-10-29', '2023-10-20', '2023-10-30')).toBe(
        true,
      );
      // Partial overlap start
      expect(isDateRangeOverlapping('2023-10-15', '2023-10-25', '2023-10-20', '2023-10-30')).toBe(
        true,
      );
      // Partial overlap end
      expect(isDateRangeOverlapping('2023-10-25', '2023-11-05', '2023-10-20', '2023-10-30')).toBe(
        true,
      );
    });

    it('detects disjoints correctly', () => {
      // Disjoint before
      expect(isDateRangeOverlapping('2023-10-10', '2023-10-15', '2023-10-20', '2023-10-30')).toBe(
        false,
      );
      // Disjoint after
      expect(isDateRangeOverlapping('2023-11-01', '2023-11-10', '2023-10-20', '2023-10-30')).toBe(
        false,
      );
    });
  });

  describe('parseGeoPoint', () => {
    it('returns null for falsy input', () => {
      expect(parseGeoPoint(undefined)).toBeNull();
      expect(parseGeoPoint('')).toBeNull();
    });

    it('parses valid geo points', () => {
      expect(parseGeoPoint('geo:37.7749,-122.4194')).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
      expect(parseGeoPoint(' geo:37.7749,-122.4194 ')).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    });

    it('returns null on invalid input format or non-finite values', () => {
      expect(parseGeoPoint('geo:abc,-122.4194')).toBeNull();
      expect(parseGeoPoint('invalid:37.7749,-122.4194')).toBeNull();
    });
  });

  describe('buildMapsSearchUrl', () => {
    it('builds URL with just coordinates', () => {
      expect(buildMapsSearchUrl(37.7749, -122.4194)).toBe(
        'https://www.google.com/maps/search/?api=1&query=37.7749%2C-122.4194',
      );
    });

    it('builds URL with placeId', () => {
      expect(buildMapsSearchUrl(37.7749, -122.4194, 'ChIJIQBpAG2ahYAR_6128GcTUEo')).toBe(
        'https://www.google.com/maps/search/?api=1&query=37.7749%2C-122.4194&query_place_id=ChIJIQBpAG2ahYAR_6128GcTUEo',
      );
    });
  });

  describe('buildPlaceKey', () => {
    it('uses placeId when available', () => {
      expect(buildPlaceKey('12345', 37.7749, -122.4194)).toBe('place:12345');
    });

    it('falls back to coordinates when placeId is absent', () => {
      expect(buildPlaceKey(undefined, 37.7749, -122.4194)).toBe('coord:37.77490,-122.41940');
      // Verify rounding/padding via toFixed(5)
      expect(buildPlaceKey(undefined, 37.77, -122.4)).toBe('coord:37.77000,-122.40000');
    });
  });

  describe('haversineDistanceMeters', () => {
    it('calculates the approximate haversine distance between two points', () => {
      const p1 = { latitude: 37.7749, longitude: -122.4194 }; // SF
      const p2 = { latitude: 34.0522, longitude: -118.2437 }; // LA
      const distance = haversineDistanceMeters(p1, p2);
      // Roughly ~559km
      expect(distance).toBeGreaterThan(550000);
      expect(distance).toBeLessThan(570000);

      expect(haversineDistanceMeters(p1, p1)).toBe(0);
    });
  });

  describe('meanCoordinate', () => {
    it('calculates the mean of given coordinates', () => {
      const points = [
        { latitude: 10, longitude: 20 },
        { latitude: 20, longitude: 40 },
        { latitude: 30, longitude: 60 },
      ];
      expect(meanCoordinate(points)).toEqual({ latitude: 20, longitude: 40 });
    });
  });

  describe('tokenizeForMatching', () => {
    it('tokenizes correctly, ignoring words of length <= 1', () => {
      expect(tokenizeForMatching('A test cafe')).toEqual(['test', 'cafe']);
      expect(tokenizeForMatching("Mcdonald's !")).toEqual(['mcdonald']);
    });
  });

  describe('merchantNamesCompatible', () => {
    it('returns false if any argument is falsy', () => {
      expect(merchantNamesCompatible(null, 'Test')).toBe(false);
      expect(merchantNamesCompatible('Test', undefined)).toBe(false);
    });

    it('returns true on exact normalized match', () => {
      expect(merchantNamesCompatible("Mcdonald's", "Mcdonald's")).toBe(true);
    });

    it('returns true if a sufficiently long sub-string is included', () => {
      expect(merchantNamesCompatible('Starbucks', 'Starbucks Coffee')).toBe(true);
    });

    it('returns true if token overlap is sufficient', () => {
      // Overlap of math.min(length, length) -> true
      expect(merchantNamesCompatible('The Home Depot', 'Home Depot')).toBe(true);
    });

    it('returns false for disjoint names', () => {
      expect(merchantNamesCompatible('Starbucks', 'Peets Coffee')).toBe(false);
    });

    it('returns false if no valid tokens', () => {
      expect(merchantNamesCompatible('A', 'B')).toBe(false);
    });
  });
});
