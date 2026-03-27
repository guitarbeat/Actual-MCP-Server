import {
  MAX_PSEUDO_STAY_CLUSTER_DISTANCE_METERS,
  MIN_PSEUDO_STAY_MINUTES,
  RECON_END_DATE,
  RECON_START_DATE,
} from './constants.js';
import {
  buildMapsSearchUrl,
  buildPlaceKey,
  haversineDistanceMeters,
  isDateRangeOverlapping,
  meanCoordinate,
  normalizeString,
  parseGeoPoint,
  parseInteger,
  parseProbability,
  toLocalDateKey,
} from './shared.js';
import type {
  ParsedTimelineEntries,
  TimelineActivitySegment,
  TimelineRawEntry,
  TimelineStay,
} from './types.js';

function buildVisitStay(entry: TimelineRawEntry): TimelineStay | null {
  const startDate = toLocalDateKey(entry.startTime);
  const endDate = toLocalDateKey(entry.endTime);
  const point = parseGeoPoint(entry.visit?.topCandidate?.placeLocation);

  if (!entry.startTime || !entry.endTime || !startDate || !endDate || !point) {
    return null;
  }

  const durationMinutes = Math.max(
    1,
    Math.round((Date.parse(entry.endTime) - Date.parse(entry.startTime)) / (1000 * 60)),
  );
  const placeId = normalizeString(entry.visit?.topCandidate?.placeID ?? undefined) ?? undefined;
  const placeKey = buildPlaceKey(placeId, point.latitude, point.longitude);

  return {
    source: 'visit',
    startTime: entry.startTime,
    endTime: entry.endTime,
    startDate,
    endDate,
    durationMinutes,
    latitude: point.latitude,
    longitude: point.longitude,
    placeKey,
    placeId,
    semanticType:
      normalizeString(entry.visit?.topCandidate?.semanticType ?? undefined) ?? undefined,
    probability: parseProbability(entry.visit?.topCandidate?.probability),
    searchUrl: buildMapsSearchUrl(point.latitude, point.longitude, placeId),
  };
}

function buildActivitySegment(entry: TimelineRawEntry): TimelineActivitySegment | null {
  const startDate = toLocalDateKey(entry.startTime);
  const endDate = toLocalDateKey(entry.endTime);

  if (!entry.startTime || !entry.endTime || !startDate || !endDate) {
    return null;
  }

  const start = parseGeoPoint(entry.activity?.start);
  const end = parseGeoPoint(entry.activity?.end);

  return {
    startTime: entry.startTime,
    endTime: entry.endTime,
    startDate,
    endDate,
    startLatitude: start?.latitude,
    startLongitude: start?.longitude,
    endLatitude: end?.latitude,
    endLongitude: end?.longitude,
    mode: normalizeString(entry.activity?.topCandidate?.type ?? undefined) ?? undefined,
    probability: parseProbability(entry.activity?.topCandidate?.probability),
    distanceMeters: parseProbability(entry.activity?.distanceMeters),
  };
}

function buildTimelinePathPseudoStays(entry: TimelineRawEntry): TimelineStay[] {
  if (
    !entry.startTime ||
    !entry.endTime ||
    !entry.timelinePath ||
    entry.timelinePath.length === 0
  ) {
    return [];
  }

  const startDate = toLocalDateKey(entry.startTime);
  const endDate = toLocalDateKey(entry.endTime);

  if (!startDate || !endDate) {
    return [];
  }

  const totalDurationMinutes = Math.max(
    0,
    Math.round((Date.parse(entry.endTime) - Date.parse(entry.startTime)) / (1000 * 60)),
  );

  const points = entry.timelinePath
    .map((point) => {
      const coords = parseGeoPoint(point.point);

      if (!coords) {
        return null;
      }

      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        offsetMinutes: parseInteger(point.durationMinutesOffsetFromStartTime) ?? 0,
      };
    })
    .filter((point): point is NonNullable<typeof point> => point !== null)
    .sort((left, right) => left.offsetMinutes - right.offsetMinutes);

  if (points.length === 0) {
    return [];
  }

  if (points.length === 1 && totalDurationMinutes >= MIN_PSEUDO_STAY_MINUTES) {
    const point = points[0];
    const placeKey = buildPlaceKey(undefined, point.latitude, point.longitude);

    return [
      {
        source: 'timelinePath',
        startTime: entry.startTime,
        endTime: entry.endTime,
        startDate,
        endDate,
        durationMinutes: totalDurationMinutes,
        latitude: point.latitude,
        longitude: point.longitude,
        placeKey,
        searchUrl: buildMapsSearchUrl(point.latitude, point.longitude),
      },
    ];
  }

  const clusters: Array<{
    startOffset: number;
    endOffset: number;
    points: Array<{ latitude: number; longitude: number }>;
  }> = [];
  let currentCluster: {
    startOffset: number;
    endOffset: number;
    points: Array<{ latitude: number; longitude: number }>;
  } | null = null;

  points.forEach((point, index) => {
    const nextOffset = points[index + 1]?.offsetMinutes ?? totalDurationMinutes;

    if (!currentCluster) {
      currentCluster = {
        startOffset: point.offsetMinutes,
        endOffset: nextOffset,
        points: [{ latitude: point.latitude, longitude: point.longitude }],
      };
      return;
    }

    const centroid = meanCoordinate(currentCluster.points);
    const distance = haversineDistanceMeters(centroid, point);

    if (distance <= MAX_PSEUDO_STAY_CLUSTER_DISTANCE_METERS) {
      currentCluster.points.push({ latitude: point.latitude, longitude: point.longitude });
      currentCluster.endOffset = nextOffset;
      return;
    }

    clusters.push(currentCluster);
    currentCluster = {
      startOffset: point.offsetMinutes,
      endOffset: nextOffset,
      points: [{ latitude: point.latitude, longitude: point.longitude }],
    };
  });

  if (currentCluster) {
    clusters.push(currentCluster);
  }

  const pseudoStays: TimelineStay[] = [];

  for (const cluster of clusters) {
    const durationMinutes = cluster.endOffset - cluster.startOffset;

    if (durationMinutes < MIN_PSEUDO_STAY_MINUTES) {
      continue;
    }

    const centroid = meanCoordinate(cluster.points);
    const placeKey = buildPlaceKey(undefined, centroid.latitude, centroid.longitude);
    const clusterStartTime = new Date(
      Date.parse(entry.startTime) + cluster.startOffset * 60 * 1000,
    ).toISOString();
    const clusterEndTime = new Date(
      Date.parse(entry.startTime) + cluster.endOffset * 60 * 1000,
    ).toISOString();

    pseudoStays.push({
      source: 'timelinePath',
      startTime: clusterStartTime,
      endTime: clusterEndTime,
      startDate: toLocalDateKey(clusterStartTime) ?? startDate,
      endDate: toLocalDateKey(clusterEndTime) ?? endDate,
      durationMinutes,
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      placeKey,
      searchUrl: buildMapsSearchUrl(centroid.latitude, centroid.longitude),
    });
  }

  return pseudoStays;
}

export function parseTimelineEntries(
  rawEntries: TimelineRawEntry[],
  startDate = RECON_START_DATE,
  endDate = RECON_END_DATE,
): ParsedTimelineEntries {
  const stays: TimelineStay[] = [];
  const activities: TimelineActivitySegment[] = [];

  for (const entry of rawEntries) {
    const entryStartDate = toLocalDateKey(entry.startTime);
    const entryEndDate = toLocalDateKey(entry.endTime);

    if (!isDateRangeOverlapping(entryStartDate, entryEndDate, startDate, endDate)) {
      continue;
    }

    if (entry.visit) {
      const stay = buildVisitStay(entry);
      if (stay) {
        stays.push(stay);
      }
      continue;
    }

    if (entry.activity) {
      const activity = buildActivitySegment(entry);
      if (activity) {
        activities.push(activity);
      }
      continue;
    }

    if (entry.timelinePath) {
      stays.push(...buildTimelinePathPseudoStays(entry));
    }
  }

  stays.sort((left, right) => left.startTime.localeCompare(right.startTime));
  activities.sort((left, right) => left.startTime.localeCompare(right.startTime));

  return { stays, activities };
}

export function parseTimelineJson(contents: string): TimelineRawEntry[] {
  const parsed = JSON.parse(contents) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('Timeline export must be a JSON array.');
  }

  return parsed as TimelineRawEntry[];
}
