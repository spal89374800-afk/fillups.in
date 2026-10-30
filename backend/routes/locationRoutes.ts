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

const normalizeText = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

// Common old / alternate spellings so a citizen can find the right district or
// city even when they type the name they have used for years.
const LOCATION_ALIASES: Record<string, string[]> = {
  'bengaluru': ['bangalore'],
  'bangalore': ['bengaluru'],
  'gurugram': ['gurgaon'],
  'gurgaon': ['gurugram'],
  'prayagraj': ['allahabad'],
  'allahabad': ['prayagraj'],
  'mysuru': ['mysore'],
  'mysore': ['mysuru'],
  'mangaluru': ['mangalore'],
  'mangalore': ['mangaluru'],
  'mumbai': ['bombay'],
  'kolkata': ['calcutta'],
  'chennai': ['madras'],
  'vadodara': ['baroda'],
  'baroda': ['vadodara'],
  'pune': ['poona'],
  'thiruvananthapuram': ['trivandrum'],
  'trivandrum': ['thiruvananthapuram'],
  'kannur': ['cannanore'],
  'kozhikode': ['calicut'],
  'calicut': ['kozhikode'],
  'kollam': ['quilon'],
  'quilon': ['kollam'],
  'thrissur': ['trichur'],
  'trichur': ['thrissur'],
  'visakhapatnam': ['vizag'],
  'vizag': ['visakhapatnam'],
  'vijayawada': ['bezawada'],
  'bezawada': ['vijayawada'],
  'bhubaneswar': ['bhubaneshwar'],
  'bhubaneshwar': ['bhubaneswar'],
  'puducherry': ['pondicherry'],
  'pondicherry': ['puducherry'],
  'odisha': ['orissa'],
  'orissa': ['odisha'],
  'uttarakhand': ['uttaranchal'],
  'uttaranchal': ['uttarakhand']
};

const STATE_ALIAS_GROUPS: string[][] = [
  ['dadra and nagar haveli and daman and diu', 'dadra and nagar haveli', 'daman and diu'],
  ['andaman and nicobar islands', 'andaman and nicobar'],
  ['jammu and kashmir', 'jammu kashmir'],
  ['delhi', 'nct of delhi'],
  ['odisha', 'orissa'],
  ['puducherry', 'pondicherry'],
  ['uttarakhand', 'uttaranchal']
];

function districtStateMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of STATES_LOCATIONS) {
    for (const district of entry.districts) {
      const key = normalizeText(district);
      if (!map.has(key)) map.set(key, entry.state);
    }
  }
  return map;
}

const DISTRICT_STATE = districtStateMap();

function levenshteinWithinOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMinimum = current[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
      current[j] = value;
      if (value < rowMinimum) rowMinimum = value;
    }
    if (rowMinimum > 1) return false;
    previous = current;
  }
  return previous[b.length] <= 1;
}

function baseScoreMatch(value: string, query: string): number {
  const lower = normalizeText(value);
  const q = normalizeText(query);
  if (!lower || !q) return 99;
  if (lower === q) return 0;
  if (lower.startsWith(q)) return 1;
  const words = lower.split(' ');
  if (words.some(word => word.startsWith(q))) return 2;
  if (lower.includes(q)) return 3;
  // Allow small spelling mistakes (e.g. "Luknow" -> "Lucknow") only after the
  // stronger matches so exact prefix results always stay on top.
  if (q.length >= 4 && q.length >= lower.length - 2 && lower.slice(0, 2) === q.slice(0, 2)) {
    if (levenshteinWithinOne(lower, q)) return 4;
    if (words.some(word => word.length >= 4 && levenshteinWithinOne(word, q))) return 4;
  }
  return 99;
}

function scoreMatch(value: string, query: string): number {
  const direct = baseScoreMatch(value, query);
  if (direct < 99) return direct;
  const aliases = LOCATION_ALIASES[normalizeText(value)] || [];
  for (const alias of aliases) {
    const aliasScore = baseScoreMatch(alias, query);
    if (aliasScore < 99) return aliasScore + 5;
  }
  return 99;
}

function stateMatches(state: string, normalizedStateFilter: string): boolean {
  if (!normalizedStateFilter) return true;
  const normalizedState = normalizeText(state);
  if (normalizedState === normalizedStateFilter) return true;
  const group = STATE_ALIAS_GROUPS.find(entries => entries.includes(normalizedStateFilter));
  return !!group && group.includes(normalizedState);
}

function collectSuggestions(
  query: string,
  stateFilter?: string,
  typeFilter?: 'district' | 'city'
): LocationSuggestion[] {
  const q = query.trim();
  if (q.length < 2) return [];

  const normalizedState = normalizeText(stateFilter);
  const stateEntries = normalizedState
    ? STATES_LOCATIONS.filter(entry => stateMatches(entry.state, normalizedState))
    : STATES_LOCATIONS;

  const candidates: LocationSuggestion[] = [];
  const seen = new Set<string>();

  const addCandidate = (value: string, type: 'district' | 'city', state?: string) => {
    const clean = String(value || '').trim();
    if (!clean) return;
    if (typeFilter && type !== typeFilter) return;
    const dedupeKey = `${type}:${clean.toLowerCase()}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    candidates.push({ value: clean, type, state });
  };

  for (const entry of stateEntries) {
    for (const district of entry.districts) {
      if (scoreMatch(district, q) < 99) addCandidate(district, 'district', entry.state);
    }
    for (const city of entry.cities) {
      if (scoreMatch(city, q) < 99) addCandidate(city, 'city', entry.state);
    }
  }

  // Registered VLEs ke district/city bhi include karo (live data)
  for (const operator of vleListStore) {
    if (normalizedState && !stateMatches(String(operator.state || ''), normalizedState)) continue;
    const district = String(operator.district || '').trim();
    const city = String(operator.city || '').trim();
    if (district && scoreMatch(district, q) < 99) addCandidate(district, 'district', operator.state || DISTRICT_STATE.get(normalizeText(district)));
    if (city && scoreMatch(city, q) < 99) addCandidate(city, 'city', operator.state);
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
  const stateFilter = typeof req.query.state === 'string' ? req.query.state : '';
  const rawType = typeof req.query.type === 'string' ? req.query.type.trim().toLowerCase() : '';
  const typeFilter = rawType === 'district' || rawType === 'city' ? rawType : undefined;

  if (query.length < 2) {
    return res.json({ success: true, query, suggestions: [] });
  }

  const suggestions = collectSuggestions(query, stateFilter, typeFilter);
  return res.json({ success: true, query, suggestions });
});

locationRouter.get('/locations/districts', (_req, res) => {
  return res.json({ success: true, districts: ALL_DISTRICTS });
});

locationRouter.get('/locations/cities', (_req, res) => {
  return res.json({ success: true, cities: ALL_CITIES });
});
