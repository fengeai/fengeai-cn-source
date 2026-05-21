import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function loadLocalEnv() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const envPath = join(currentDir, '..', '..', '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const name = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');

    if (name && process.env[name] === undefined) {
      process.env[name] = value;
    }
  }
}

loadLocalEnv();

function readEnv(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  port: Number(process.env.PORT ?? 3100),
  webUrl: readEnv('WEB_URL', 'http://localhost:3002'),
  llmProvider: readEnv('LLM_PROVIDER', 'mock'),
  zhipuApiKey: readEnv('ZHIPU_API_KEY'),
  zhipuBaseUrl: readEnv('ZHIPU_BASE_URL', 'https://open.bigmodel.cn/api/coding/paas/v4'),
  zhipuModel: readEnv('ZHIPU_MODEL', 'GLM-4.7'),
};
