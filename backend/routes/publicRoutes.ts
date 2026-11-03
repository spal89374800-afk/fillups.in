import { Router } from 'express';
import {
  getPublicServiceBySlug,
  getPublicServiceOperators,
  listPublicServices
} from '../services/publicCatalogService.ts';

export const publicRouter = Router();

// Public, crawlable service catalogue. No account is required and no private
// operator contact details are exposed.
publicRouter.get('/public/services', (req, res) => {
  const services = listPublicServices();
  const query = String(req.query.q || '').trim().toLowerCase();
  const filtered = query
    ? services.filter(service =>
        service.name.toLowerCase().includes(query) ||
        service.slug.includes(query) ||
        service.requirements.some(item => item.toLowerCase().includes(query))
      )
    : services;
  res.json({
    success: true,
    count: filtered.length,
    services: filtered
  });
});

publicRouter.get('/public/services/:slug', (req, res) => {
  const service = getPublicServiceBySlug(req.params.slug);
  if (!service) {
    return res.status(404).json({ success: false, error: 'Service not found.' });
  }
  res.json({ success: true, service });
});

publicRouter.get('/public/services/:slug/operators', (req, res) => {
  const service = getPublicServiceBySlug(req.params.slug);
  if (!service) {
    return res.status(404).json({ success: false, error: 'Service not found.' });
  }
  const operators = getPublicServiceOperators(req.params.slug, {
    state: String(req.query.state || ''),
    district: String(req.query.district || ''),
    city: String(req.query.city || '')
  });
  res.json({
    success: true,
    scope: service.scope,
    count: operators.length,
    operators
  });
});
