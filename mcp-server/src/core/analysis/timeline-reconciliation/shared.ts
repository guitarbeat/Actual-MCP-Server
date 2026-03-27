import { EXACT_MATCH_SHORT_TEXT_LENGTH } from './constants.js';

export function normalizeString(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeComparisonText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeMerchantKey(value: string | null | undefined): string {
  return normalizeComparisonText(value).replace(/\s+/g, ' ');
}

export function parseMoneyToCents(value: string): number {
  const parsed = Number.parseFloat(value.replace(/,/g, ''));

  if (!Number.isFinite(parsed)) {
    throw new Error(`Unable to parse monetary value: ${value}`);
  }

  return Math.round(parsed * 100);
}

export function parseProbability(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toLocalDateKey(timestamp: string | undefined): string | null {
  return timestamp && /^\d{4}-\d{2}-\d{2}/.test(timestamp) ? timestamp.slice(0, 10) : null;
}

export function dateKeyToMillis(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export function diffCalendarDays(dateA: string, dateB: string): number {
  return Math.round((dateKeyToMillis(dateA) - dateKeyToMillis(dateB)) / (1000 * 60 * 60 * 24));
}

export function isDateRangeOverlapping(
  startDate: string | null,
  endDate: string | null,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  if (!startDate || !endDate) {
    return false;
  }

  return !(endDate < rangeStart || startDate > rangeEnd);
}

export function parseGeoPoint(
  value: string | undefined,
): { latitude: number; longitude: number } | null {
  if (!value) {
    return null;
  }

  const match = /^geo:([-0-9.]+),([-0-9.]+)$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const latitude = Number.parseFloat(match[1]);
  const longitude = Number.parseFloat(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export function buildMapsSearchUrl(latitude: number, longitude: number, placeId?: string): string {
  const coords = `${latitude},${longitude}`;
  return placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}&query_place_id=${encodeURIComponent(placeId)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`;
}

export function buildPlaceKey(placeId: string | undefined, latitude: number, longitude: number): string {
  return placeId ? `place:${placeId}` : `coord:${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

export function haversineDistanceMeters(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
): number {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(right.latitude - left.latitude);
  const deltaLongitude = toRadians(right.longitude - left.longitude);
  const lat1 = toRadians(left.latitude);
  const lat2 = toRadians(right.latitude);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

export function meanCoordinate(points: Array<{ latitude: number; longitude: number }>): {
  latitude: number;
  longitude: number;
} {
  return {
    latitude: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
    longitude: points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
  };
}

export function tokenizeForMatching(value: string): string[] {
  return normalizeComparisonText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

export function merchantNamesCompatible(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const normalizedLeft = normalizeMerchantKey(left);
  const normalizedRight = normalizeMerchantKey(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const shorter =
    normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight;
  const longer = shorter === normalizedLeft ? normalizedRight : normalizedLeft;

  if (shorter.length >= EXACT_MATCH_SHORT_TEXT_LENGTH && longer.includes(shorter)) {
    return true;
  }

  const leftTokens = tokenizeForMatching(normalizedLeft);
  const rightTokens = tokenizeForMatching(normalizedRight);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return false;
  }

  const overlap = leftTokens.filter((token) => rightTokens.includes(token)).length;
  return overlap >= Math.min(leftTokens.length, rightTokens.length);
}
