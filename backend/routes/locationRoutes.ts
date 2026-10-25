import { Router } from 'express';
import { ALL_CITIES, ALL_DISTRICTS, STATES_LOCATIONS } from '../data/locations.ts';
import { vleListStore } from '../services/storeService.ts';

export const locationRouter = Router();

interface LocationSuggestion {
  value: string;
  type: 'district' | 'city';
  state?: string;
}

const MAX_SUGGESTIONS = 20;

function districtStateMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of STATES_LOCATIONS) {
    for (const district of entry.districts) {
      const key = district.toLowerCase();
      if (!map.has(key)) map.set(key, entry.state);
    }
  }
  return map;
}

const DISTRICT_STATE = districtStateMap();

function scoreMatch(value: string, query: string): number {
  const lower = value.toLowerCase();
  if (lower === query) return 0;
  if (lower.startsWith(query)) return 1;
  const words = lower.split(/[\s&]+/);
  if (words.some(word => word.startsWith(query))) return 2;
  if (lower.includes(query)) return 3;
  return 99;
}

function collectSuggestions(query: string): LocationSuggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const candidates: LocationSuggestion[] = [];
  const seen = new Set<string>();

  const addCandidate = (value: string, type: 'district' | 'city', state?: string) => {
    const clean = String(value || '').trim();
    if (!clean) return;
    const dedupeKey = `${type}:${clean.toLowerCase()}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    candidates.push({ value: clean, type, state });
  };

  for (const district of ALL_DISTRICTS) {
    if (scoreMatch(district, q) < 99) addCandidate(district, 'district', DISTRICT_STATE.get(district.toLowerCase()));
  }
  for (const city of ALL_CITIES) {
    if (scoreMatch(city, q) < 99) addCandidate(city, 'city');
  }

  // Registered VLEs ke district/city bhi include karo (live data)
  for (const operator of vleListStore) {
    const district = String(operator.district || '').trim();
    const city = String(operator.city || '').trim();
    if (district && scoreMatch(district, q) < 99) addCandidate(district, 'district', DISTRICT_STATE.get(district.toLowerCase()));
    if (city && scoreMatch(city, q) < 99) addCandidate(city, 'city');
  }

  candidates.sort((a, b) => {
    const sa = scoreMatch(a.value, q);
    const sb = scoreMatch(b.value, q);
    if (sa !== sb) return sa - sb;
    const typeRank = (t: 'district' | 'city') => (t === 'district' ? 0 : 1);
    if (typeRank(a.type) !== typeRank(b.type)) return typeRank(a.type) - typeRank(b.type);
    return a.value.localeCompare(b.value);
  });

  return candidates.slice(0, MAX_SUGGESTIONS);
}

locationRouter.get('/locations', (req, res) => {
  const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
  const query = rawQuery.trim();

  if (query.length < 2) {
    return res.json({ success: true, query, suggestions: [] });
  }

  const suggestions = collectSuggestions(query);
  return res.json({ success: true, query, suggestions });
});

locationRouter.get('/locations/districts', (_req, res) => {
  return res.json({ success: true, districts: ALL_DISTRICTS });
});

locationRouter.get('/locations/cities', (_req, res) => {
  return res.json({ success: true, cities: ALL_CITIES });
});
