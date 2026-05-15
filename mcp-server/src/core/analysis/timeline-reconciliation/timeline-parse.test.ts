import { describe, it, expect } from 'vitest';
import { parseTimelineEntries, parseTimelineJson } from './timeline-parse.js';
import type { TimelineRawEntry } from './types.js';

describe('Timeline Parse', () => {
  describe('parseTimelineJson', () => {
    it('should parse valid JSON array', () => {
      const json = '[{"startTime":"2023-01-01T10:00:00Z"}]';
      const result = parseTimelineJson(json);
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBe('2023-01-01T10:00:00Z');
    });

    it('should throw if JSON is not an array', () => {
      const json = '{"startTime":"2023-01-01T10:00:00Z"}';
      expect(() => parseTimelineJson(json)).toThrow('Timeline export must be a JSON array.');
    });

    it('should throw if JSON is invalid', () => {
      const json = '[{"startTime":"2023-01-01T10:00:00Z"}';
      expect(() => parseTimelineJson(json)).toThrow();
    });
  });

  describe('parseTimelineEntries', () => {
    it('should correctly parse an empty array', () => {
      const result = parseTimelineEntries([]);
      expect(result.stays).toHaveLength(0);
      expect(result.activities).toHaveLength(0);
    });

    it('should extract visit stay data correctly', () => {
      const rawEntries: TimelineRawEntry[] = [
        {
          startTime: '2023-08-05T12:00:00Z',
          endTime: '2023-08-05T13:00:00Z',
          visit: {
            topCandidate: {
              placeID: 'ChIJXYZ',
              placeLocation: 'geo:37.7749,-122.4194',
              semanticType: 'RESTAURANT',
              probability: '0.9',
            },
          },
        },
      ];

      const result = parseTimelineEntries(rawEntries, '2023-08-01', '2023-08-10');
      expect(result.activities).toHaveLength(0);
      expect(result.stays).toHaveLength(1);

      const stay = result.stays[0];
      expect(stay.source).toBe('visit');
      expect(stay.startTime).toBe('2023-08-05T12:00:00Z');
      expect(stay.endTime).toBe('2023-08-05T13:00:00Z');
      expect(stay.startDate).toBe('2023-08-05');
      expect(stay.endDate).toBe('2023-08-05');
      expect(stay.durationMinutes).toBe(60);
      expect(stay.placeId).toBe('ChIJXYZ');
      expect(stay.latitude).toBe(37.7749);
      expect(stay.longitude).toBe(-122.4194);
      expect(stay.semanticType).toBe('RESTAURANT');
      expect(stay.probability).toBe(0.9);
      expect(stay.placeKey).toContain('ChIJXYZ');
      expect(stay.searchUrl).toContain('37.7749');
    });

    it('should extract activity segment data correctly', () => {
      const rawEntries: TimelineRawEntry[] = [
        {
          startTime: '2023-08-05T14:00:00Z',
          endTime: '2023-08-05T14:30:00Z',
          activity: {
            start: 'geo:37.7749,-122.4194',
            end: 'geo:37.7849,-122.4094',
            distanceMeters: '1500',
            topCandidate: {
              type: 'WALKING',
              probability: '0.95',
            },
          },
        },
      ];

      const result = parseTimelineEntries(rawEntries, '2023-08-01', '2023-08-10');
      expect(result.stays).toHaveLength(0);
      expect(result.activities).toHaveLength(1);

      const activity = result.activities[0];
      expect(activity.startTime).toBe('2023-08-05T14:00:00Z');
      expect(activity.endTime).toBe('2023-08-05T14:30:00Z');
      expect(activity.startDate).toBe('2023-08-05');
      expect(activity.endDate).toBe('2023-08-05');
      expect(activity.startLatitude).toBe(37.7749);
      expect(activity.startLongitude).toBe(-122.4194);
      expect(activity.endLatitude).toBe(37.7849);
      expect(activity.endLongitude).toBe(-122.4094);
      expect(activity.mode).toBe('WALKING');
      expect(activity.probability).toBe(0.95);
      expect(activity.distanceMeters).toBe(1500);
    });

    it('should extract timeline path pseudo stays correctly', () => {
      const rawEntries: TimelineRawEntry[] = [
        {
          startTime: '2023-08-05T15:00:00Z',
          endTime: '2023-08-05T16:00:00Z',
          timelinePath: [
            { point: 'geo:37.7749,-122.4194', durationMinutesOffsetFromStartTime: '0' },
            { point: 'geo:37.7750,-122.4195', durationMinutesOffsetFromStartTime: '15' },
            { point: 'geo:37.7748,-122.4193', durationMinutesOffsetFromStartTime: '30' },
          ],
        },
      ];

      const result = parseTimelineEntries(rawEntries, '2023-08-01', '2023-08-10');
      expect(result.activities).toHaveLength(0);
      expect(result.stays).toHaveLength(1);

      const stay = result.stays[0];
      expect(stay.source).toBe('timelinePath');
      expect(stay.durationMinutes).toBe(60);
    });

    it('should group close timeline points into a single pseudo stay', () => {
      const rawEntries: TimelineRawEntry[] = [
        {
          startTime: '2023-08-05T15:00:00Z',
          endTime: '2023-08-05T16:00:00Z',
          timelinePath: [
            { point: 'geo:37.7749,-122.4194', durationMinutesOffsetFromStartTime: '0' },
            { point: 'geo:37.7750,-122.4195', durationMinutesOffsetFromStartTime: '15' },
            { point: 'geo:37.7748,-122.4193', durationMinutesOffsetFromStartTime: '30' },
          ],
        },
      ];

      const result = parseTimelineEntries(rawEntries, '2023-08-01', '2023-08-10');
      expect(result.activities).toHaveLength(0);
      expect(result.stays).toHaveLength(1);

      const stay = result.stays[0];
      expect(stay.source).toBe('timelinePath');
      expect(stay.durationMinutes).toBeGreaterThanOrEqual(30);
    });

    it('should split distant timeline points into multiple pseudo stays', () => {
      const rawEntries: TimelineRawEntry[] = [
        {
          startTime: '2023-08-05T15:00:00Z',
          endTime: '2023-08-05T18:00:00Z',
          timelinePath: [
            { point: 'geo:37.7749,-122.4194', durationMinutesOffsetFromStartTime: '0' },
            { point: 'geo:37.7750,-122.4195', durationMinutesOffsetFromStartTime: '30' },
            // Way far away, this should split the cluster if time allows
            { point: 'geo:40.7128,-74.0060', durationMinutesOffsetFromStartTime: '90' },
            { point: 'geo:40.7129,-74.0061', durationMinutesOffsetFromStartTime: '120' },
          ],
        },
      ];

      const result = parseTimelineEntries(rawEntries, '2023-08-01', '2023-08-10');
      expect(result.activities).toHaveLength(0);
      expect(result.stays).toHaveLength(2);

      expect(result.stays[0].source).toBe('timelinePath');
      expect(result.stays[1].source).toBe('timelinePath');
    });

    it('should filter out entries outside the date range', () => {
      const rawEntries: TimelineRawEntry[] = [
        {
          startTime: '2023-07-05T12:00:00Z',
          endTime: '2023-07-05T13:00:00Z',
          visit: {
            topCandidate: { placeLocation: 'geo:0,0' },
          },
        },
      ];

      const result = parseTimelineEntries(rawEntries, '2023-08-01', '2023-08-10');
      expect(result.stays).toHaveLength(0);
      expect(result.activities).toHaveLength(0);
    });

    it('should handle entries missing start or end times gracefully', () => {
      const rawEntries: TimelineRawEntry[] = [
        {
          visit: {
            topCandidate: { placeLocation: 'geo:0,0' },
          },
        },
      ];

      const result = parseTimelineEntries(rawEntries, '2023-08-01', '2023-08-10');
      expect(result.stays).toHaveLength(0);
      expect(result.activities).toHaveLength(0);
    });

    it('should ignore timelinePath pseudo stays that are shorter than MIN_PSEUDO_STAY_MINUTES', () => {
      const rawEntries: TimelineRawEntry[] = [
        {
          startTime: '2023-08-05T15:00:00Z',
          endTime: '2023-08-05T15:20:00Z',
          timelinePath: [
            { point: 'geo:37.7749,-122.4194', durationMinutesOffsetFromStartTime: '0' },
            { point: 'geo:37.7750,-122.4195', durationMinutesOffsetFromStartTime: '10' },
          ],
        },
      ];

      const result = parseTimelineEntries(rawEntries, '2023-08-01', '2023-08-10');
      expect(result.activities).toHaveLength(0);
      expect(result.stays).toHaveLength(0);
    });
  });
});
