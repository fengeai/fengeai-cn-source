function normalizeTasksUrl(baseUrl) {
  const trimmed = baseUrl.replace(/\/$/, '');
  if (trimmed.endsWith('/contents/generations/tasks')) {
    return trimmed;
  }
  if (trimmed.endsWith('/api/v3')) {
    return `${trimmed}/contents/generations/tasks`;
  }
  return `${trimmed}/api/v3/contents/generations/tasks`;
}

function readProviderError(data) {
  return data?.error?.message || data?.message || data?.error || 'Seedance request failed';
}

export function createSeedanceVideoProvider({
  apiKey,
  baseUrl,
  model,
  referenceModel,
  qualityModel,
  finalModel,
  resolution = '480p',
  watermark = false
}) {
  if (!apiKey) {
    throw new Error('SEEDANCE_API_KEY is required when VIDEO_PROVIDER=seedance');
  }

  const tasksUrl = normalizeTasksUrl(baseUrl || 'https://ark.cn-beijing.volces.com/api/v3');

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(readProviderError(data));
    }
    return data;
  }

  return {
    async createVideo(input) {
      const baseModel = input.referenceImageUrl && referenceModel ? referenceModel : model;
      const selectedModel = input.qualityMode === 'final'
        ? (finalModel || qualityModel || baseModel)
        : input.qualityMode === 'better'
          ? (qualityModel || baseModel)
          : (input.model || baseModel);
      const content = [
        {
          type: 'text',
          text: input.prompt
        }
      ];

      if (input.referenceImageUrl) {
        content.push({
          type: 'image_url',
          image_url: { url: input.referenceImageUrl },
          role: input.referenceRole || 'reference_image',
          ...(input.subjectType ? { subject_type: input.subjectType } : {})
        });
      }

      const data = await requestJson(tasksUrl, {
        method: 'POST',
        body: JSON.stringify({
          model: selectedModel,
          content,
          ratio: input.aspectRatio,
          duration: input.durationSec || 5,
          resolution: input.resolution || resolution,
          generate_audio: input.generateAudio === true,
          watermark
        })
      });

      const providerJobId = data.id || data.task_id;
      if (!providerJobId) {
        throw new Error('Seedance did not return a task id');
      }
      return { providerJobId };
    },

    async getVideo(providerJobId) {
      const data = await requestJson(`${tasksUrl}/${providerJobId}`, { method: 'GET' });
      const status = data.status || 'running';
      const videoUrl = data.content?.video_url || data.video_url || data.output?.video_url || '';
      const error = data.error?.message || data.error || '';

      return {
        status,
        currentStep: status === 'succeeded' ? '已完成' : status,
        videoUrl,
        error
      };
    },

    async checkConnection() {
      const url = new URL(tasksUrl);
      url.searchParams.set('page_num', '1');
      url.searchParams.set('page_size', '1');
      const data = await requestJson(url.toString(), { method: 'GET' });
      return {
        ok: true,
        model,
        tasksUrl,
        total: data.total || data.total_count || data?.data?.total || 0
      };
    }
  };
}
