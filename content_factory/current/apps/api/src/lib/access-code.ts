import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

const codes = new Set(
  env.accessCodes
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean),
);

export function isAccessControlEnabled() {
  return codes.size > 0;
}

export function isValidAccessCode(value: unknown) {
  if (!isAccessControlEnabled()) {
    return true;
  }

  return typeof value === 'string' && codes.has(value.trim());
}

export function requireAccessCode(request: FastifyRequest, reply: FastifyReply): boolean {
  if (isValidAccessCode(request.headers['x-content-factory-code'])) {
    return true;
  }

  reply.status(401).send({
    message: '内容工厂需要访问码，请添加枫哥微信获取访问码。',
    error: 'ACCESS_CODE_REQUIRED',
  });

  return false;
}
