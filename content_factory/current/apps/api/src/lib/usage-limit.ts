import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

type UsageBucket = {
  count: number;
  resetAt: number;
};

const usageBuckets = new Map<string, UsageBucket>();

const windowMs = Math.max(1, env.publicUsageWindowHours) * 60 * 60 * 1000;
const limit = Math.max(1, env.publicUsageLimit);

function firstHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

function getVisitorKey(request: FastifyRequest): string {
  const forwardedFor = firstHeaderValue(request.headers['x-forwarded-for']);
  const realIp = firstHeaderValue(request.headers['x-real-ip']);
  const ip = forwardedFor.split(',')[0]?.trim() || realIp.trim() || request.ip || 'unknown';

  return `ip:${ip}`;
}

function hasAdminBypass(request: FastifyRequest): boolean {
  if (!env.adminUsageBypassToken) {
    return false;
  }

  const token = firstHeaderValue(request.headers['x-content-factory-admin-token']);
  return token === env.adminUsageBypassToken;
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of usageBuckets.entries()) {
    if (bucket.resetAt <= now) {
      usageBuckets.delete(key);
    }
  }
}

export function consumePublicUsage(request: FastifyRequest, reply: FastifyReply): boolean {
  if (hasAdminBypass(request)) {
    return true;
  }

  const now = Date.now();
  pruneExpiredBuckets(now);

  const key = getVisitorKey(request);
  const current = usageBuckets.get(key);
  const bucket = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + windowMs };

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    reply
      .status(429)
      .header('Retry-After', String(retryAfterSeconds))
      .send({
        message: '今天的免费体验次数已用完，请5小时后再来。',
        error: 'PUBLIC_USAGE_LIMIT_EXCEEDED',
        retryAfterSeconds,
        limit,
      });

    return false;
  }

  bucket.count += 1;
  usageBuckets.set(key, bucket);

  return true;
}
