import { type Request, type Response, type NextFunction } from "express";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

export function webhookAuth(req: Request, res: Response, next: NextFunction): void {
  if (!WEBHOOK_SECRET) {
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Webhook authentication is not configured. Set the WEBHOOK_SECRET environment variable.',
    });
    return;
  }

  const providedSecret =
    (req.headers['x-webhook-secret'] as string | undefined) ||
    (req.body && req.body.secret);

  if (!providedSecret || providedSecret !== WEBHOOK_SECRET) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing webhook secret.',
    });
    return;
  }

  next();
}
