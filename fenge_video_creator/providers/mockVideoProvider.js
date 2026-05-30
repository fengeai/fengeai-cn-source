const jobs = new Map();

export function createMockVideoProvider({ publicBaseUrl }) {
  return {
    async createVideo(input) {
      const providerJobId = `mock_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      jobs.set(providerJobId, {
        createdAt: Date.now(),
        input
      });
      return { providerJobId };
    },

    async getVideo(providerJobId) {
      const job = jobs.get(providerJobId);
      if (!job) {
        return { status: 'failed', currentStep: '任务不存在', error: 'mock provider job not found' };
      }

      const elapsed = Date.now() - job.createdAt;
      if (elapsed < 2000) {
        return { status: 'queued', currentStep: '排队中' };
      }
      if (elapsed < 5000) {
        return { status: 'running', currentStep: '正在生成画面' };
      }
      if (elapsed < 8000) {
        return { status: 'running', currentStep: '正在合成字幕和配音' };
      }

      return {
        status: 'succeeded',
        currentStep: '已完成',
        videoUrl: `${publicBaseUrl}/video/sample-result.mp4?job=${encodeURIComponent(providerJobId)}`
      };
    }
  };
}
