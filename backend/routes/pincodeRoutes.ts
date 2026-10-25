import { Router } from 'express';

export const pincodeRouter = Router();

// In-memory cache for fast PIN code lookups
const pincodeCache = new Map<string, any>();

pincodeRouter.get('/pincode/:pincode', async (req, res) => {
  const { pincode } = req.params;
  if (!pincode || pincode.length !== 6 || !/^\d+$/.test(pincode)) {
    return res.status(400).json({ success: false, error: 'Invalid 6-digit PIN code format.' });
  }

  if (pincodeCache.has(pincode)) {
    return res.json({ success: true, source: 'cache', data: pincodeCache.get(pincode) });
  }

  try {
    // Call 3rd party secure Postal API (India Post open API)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const apiRes = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
        signal: controller.signal
      });
      if (!apiRes.ok) {
        throw new Error(`Postal API returned HTTP ${apiRes.status}`);
      }

      const json = await apiRes.json() as Array<{
        Status?: string;
        PostOffice?: Array<{ District?: string; State?: string; Name?: string; Block?: string; Taluk?: string }>;
      }>;
      if (json[0]?.Status === 'Success' && json[0].PostOffice?.length) {
        const po = json[0].PostOffice[0];
        const result = {
          pincode,
          district: po.District || '',
          state: po.State || '',
          officeName: po.Name || '',
          block: po.Block || po.Taluk || 'Standard'
        };
        pincodeCache.set(pincode, result);
        return res.json({ success: true, source: 'india-post-api', data: result });
      }
      if (json[0]?.Status === 'Error') {
        return res.status(404).json({ success: false, error: 'PIN code not found.' });
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.error('India Post PIN lookup failed:', err);
  }

  res.status(503).json({
    success: false,
    error: 'PIN code lookup is temporarily unavailable. Please try again.'
  });
});
