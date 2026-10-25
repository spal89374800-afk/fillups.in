import { Router } from 'express';
import { statsRouter } from './statsRoutes.ts';
import { aiRouter } from './aiRoutes.ts';
import { vleRouter } from './vleRoutes.ts';
import { fillerRouter } from './fillerRoutes.ts';
import { orderRouter } from './orderRoutes.ts';
import { communityRouter } from './communityRoutes.ts';
import { pincodeRouter } from './pincodeRoutes.ts';
import { liveCameraRouter } from './liveCameraRoutes.ts';
import { authRouter } from './authRoutes.ts';
import { paymentRouter } from './paymentRoutes.ts';
import { locationRouter } from './locationRoutes.ts';
import { adminSecurityRouter } from './adminSecurityRoutes.ts';
import { globalApiLimiter, sanitizeInputs, securityHeadersMiddleware, resolveAccount } from '../middleware/securityMiddleware.ts';

export const apiRouter = Router();

// 🛡️ ANTI-HACK & ANTI-BILL EXPLOSION: Rate Limiting & Security Headers
apiRouter.use(securityHeadersMiddleware);
apiRouter.use(globalApiLimiter);
apiRouter.use(sanitizeInputs);
apiRouter.use(resolveAccount);

apiRouter.use(authRouter);
apiRouter.use(paymentRouter);
apiRouter.use(statsRouter);
apiRouter.use(aiRouter);
apiRouter.use(vleRouter);
apiRouter.use(fillerRouter);
apiRouter.use(orderRouter);
apiRouter.use(communityRouter);
apiRouter.use(pincodeRouter);
apiRouter.use(locationRouter);
apiRouter.use(liveCameraRouter);

// 🛡️ Admin Security Console (attack log + IP blocklist) — ADMIN_TOKEN protected.
apiRouter.use(adminSecurityRouter);
