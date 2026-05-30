function fallbackPlan(project) {
  const source = project.sourceContent.trim();
  const topic = source.slice(0, 36) || '枫哥AI进化社短视频';

  return {
    title: `${topic}：60秒讲清楚`,
    aspectRatio: '9:16',
    durationSec: 60,
    script: [
      `开场：今天用一个真实问题讲清楚：${topic}。`,
      '主体：先说结论，再给一个可以马上照做的步骤。',
      '收束：把这件事变成一次行动，而不是停留在听懂。'
    ].join('\n'),
    storyboard: [
      {
        order: 1,
        durationSec: 8,
        narration: `今天我们聊：${topic}`,
        visualPrompt: '竖屏知识口播开场，干净背景，人物面对镜头，字幕醒目'
      },
      {
        order: 2,
        durationSec: 36,
        narration: '拆成三个动作：看见问题、设计流程、交给数字员工执行。',
        visualPrompt: 'AI工作流看板，三个步骤依次点亮，现代中文内容创作场景'
      },
      {
        order: 3,
        durationSec: 16,
        narration: '最后留一个行动：今天就把一个重复任务做成可复用流程。',
        visualPrompt: '行动清单与完成状态，温暖明亮，适合知识类短视频结尾'
      }
    ],
    generatedBy: 'fallback'
  };
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('模型没有返回可解析的视频方案 JSON');
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizePlan(plan) {
  const storyboard = Array.isArray(plan.storyboard) ? plan.storyboard : [];
  const normalizedStoryboard = storyboard.slice(0, 6).map((item, index) => ({
    order: index + 1,
    durationSec: Number(item.durationSec || 8),
    narration: String(item.narration || '').trim(),
    visualPrompt: String(item.visualPrompt || '').trim()
  })).filter(item => item.narration && item.visualPrompt);
  const script = String(plan.script || '').trim() || normalizedStoryboard.map(item => item.narration).join('\n');

  return {
    title: String(plan.title || '枫哥AI进化社短视频').slice(0, 80),
    aspectRatio: plan.aspectRatio === '16:9' ? '16:9' : '9:16',
    durationSec: Number(plan.durationSec || 60),
    script,
    storyboard: normalizedStoryboard,
    generatedBy: 'llm'
  };
}

function getLlmConfig() {
  const apiKey = process.env.VIDEO_LLM_API_KEY || process.env.ASSISTANT_API_KEY || '';
  const baseUrl = (process.env.VIDEO_LLM_BASE_URL || process.env.ASSISTANT_BASE_URL || '').replace(/\/$/, '');
  const model = process.env.VIDEO_LLM_MODEL || process.env.ASSISTANT_MODEL || '';
  const timeoutMs = Number(process.env.VIDEO_LLM_TIMEOUT_MS || 180000);
  const maxTokens = Number(process.env.VIDEO_LLM_MAX_TOKENS || 1600);
  return { apiKey, baseUrl, model, timeoutMs, maxTokens };
}

export function getPlannerStatus() {
  const config = getLlmConfig();
  return {
    configured: Boolean(config.apiKey && config.baseUrl && config.model),
    baseUrl: config.baseUrl,
    model: config.model,
    timeoutMs: config.timeoutMs,
    maxTokens: config.maxTokens,
    mode: config.apiKey && config.baseUrl && config.model ? 'llm' : 'fallback'
  };
}

export async function createVideoPlan(project) {
  const config = getLlmConfig();
  if (!config.apiKey || !config.baseUrl || !config.model) {
    return fallbackPlan(project);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  const assets = Array.isArray(project.assets) && project.assets.length > 0
    ? project.assets.map((asset, index) => `${index + 1}. ${asset.mimeType || 'asset'}：${asset.url}`).join('\n')
    : '无';

  const prompt = [
    '你是枫哥AI进化社的短视频策划员工。请把用户输入转成一个适合中文知识短视频的视频方案。',
    '要求：只返回 JSON，不要 Markdown，不要解释。',
    'JSON 字段：title, aspectRatio, durationSec, script, storyboard。',
    'script 必须是一段完整中文口播稿，约 250 到 400 字，不能只写提纲。',
    'storyboard 是数组，每项包含 durationSec, narration, visualPrompt。',
    'storyboard.narration 是该镜头对应的口播句子，visualPrompt 是给视频生成模型看的画面描述。',
    '风格：具体、行动导向、适合口播，不要空泛鸡汤。',
    '默认竖屏 9:16，总时长 45 到 60 秒，分 3 到 5 个镜头。',
    '',
    `输入来源：${project.sourceType}`,
    `输入内容：${project.sourceContent}`,
    '',
    '已上传素材：',
    assets,
    '',
    '如果用户上传了参考图，请在分镜 visualPrompt 中明确说明如何使用参考图，并保持主体一致。'
  ].join('\n');

  let response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.55,
        max_tokens: config.maxTokens,
        messages: [
          { role: 'system', content: '你只输出可解析 JSON。' },
          { role: 'user', content: prompt }
        ]
      })
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`视频方案大模型请求超过 ${Math.round(config.timeoutMs / 1000)} 秒，请稍后重试。`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || '视频方案大模型请求失败');
  }

  const content = data.choices?.[0]?.message?.content || '';
  const plan = normalizePlan(extractJson(content));
  if (!plan.script || plan.storyboard.length === 0) {
    throw new Error('模型返回的视频方案不完整');
  }
  return plan;
}
