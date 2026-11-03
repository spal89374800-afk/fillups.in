import { fetchWithRetry, parseJsonResponse } from './apiClient';

export type PublicServiceScope = 'district' | 'national' | 'online_form';

export interface PublicServiceFees {
  totalMin: number;
  totalMax: number;
  govtFeeMin: number;
  govtFeeMax: number;
  serviceFeeMin: number;
  serviceFeeMax: number;
}

export interface PublicServiceOperator {
  id: string;
  name: string;
  city: string;
  district: string;
  state: string;
  role: 'vle' | 'filler';
  verified: boolean;
  complianceScore: number;
}

export interface PublicServiceFaq {
  q: string;
  a: string;
  qHi: string;
  aHi: string;
}

export interface PublicService {
  slug: string;
  name: string;
  icon: string;
  scope: PublicServiceScope;
  description: string;
  requirements: string[];
  fees: PublicServiceFees;
  operatorCount: number;
  operatorCountVle: number;
  operatorCountFiller: number;
  states: string[];
  districts: string[];
  cities: string[];
  operators: PublicServiceOperator[];
  faqs: PublicServiceFaq[];
  updatedAt: string;
}

export async function fetchPublicServices(): Promise<PublicService[]> {
  const response = await fetchWithRetry('/api/public/services');
  const data = await parseJsonResponse(response);
  if (!response.ok || !data.success || !Array.isArray(data.services)) {
    throw new Error(data.error || 'Could not load the service catalogue.');
  }
  return data.services as PublicService[];
}

export async function fetchPublicService(slug: string): Promise<PublicService> {
  const response = await fetchWithRetry(`/api/public/services/${encodeURIComponent(slug)}`);
  const data = await parseJsonResponse(response);
  if (!response.ok || !data.success || !data.service) {
    throw new Error(data.error || 'Service not found.');
  }
  return data.service as PublicService;
}
