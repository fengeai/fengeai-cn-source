import { createMockVideoProvider } from './mockVideoProvider.js';
import { createSeedanceVideoProvider } from './seedanceVideoProvider.js';

export function createVideoProvider({ publicBaseUrl }) {
  const provider = process.env.VIDEO_PROVIDER || 'mock';

  if (provider === 'seedance') {
    return createSeedanceVideoProvider({
      apiKey: process.env.SEEDANCE_API_KEY || '',
      baseUrl: process.env.SEEDANCE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
      model: process.env.VIDEO_MODEL || 'doubao-seedance-1-0-pro-fast-251015',
      referenceModel: process.env.VIDEO_REFERENCE_MODEL || '',
      qualityModel: process.env.VIDEO_QUALITY_MODEL || '',
      finalModel: process.env.VIDEO_FINAL_MODEL || '',
      resolution: process.env.VIDEO_RESOLUTION || '480p',
      watermark: process.env.VIDEO_WATERMARK === 'true'
    });
  }

  return createMockVideoProvider({ publicBaseUrl });
}
