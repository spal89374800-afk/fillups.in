import {scoreRequest, resolveClientNetwork} from './backend/middleware/botShieldMiddleware.ts';
const req: any = {
  method: 'GET',
  path: '/api/auth/retention-policy',
  url: '/api/auth/retention-policy',
  headers: {
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'accept': 'application/json',
    'accept-language': 'en-US,en;q=0.9'
  },
  socket: { remoteAddress: '127.0.0.1' }
};
const net = resolveClientNetwork(req);
const res = scoreRequest(req, net);
console.log(JSON.stringify(res));
