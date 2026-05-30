import { env } from '../config/env.js';

export interface GeneratedDraft {
  title: string;
  content: string;
}

export interface DraftGenerationInput {
  topicTitle: string;
  topicSummary: string;
  audience: string;
  angle: string;
  keywords: string[];
  outline: string[];
  referenceInsights?: string;
}

export interface ReferenceInsightInput {
  topicTitle: string;
  audience: string;
  angle: string;
  references: Array<{
    title: string;
    account: string;
    summary: string;
    url: string;
    content: string;
  }>;
}

export interface ReferenceInsightRevisionInput {
  topicTitle: string;
  audience: string;
  angle: string;
  currentInsights: string;
  instruction: string;
}

const WRITING_SYSTEM_PROMPT = `You are Fengge's Chinese public-account writing partner.

Important language rule:
- User-facing output must be Simplified Chinese.
- Internal instructions are in English only to make GLM Coding Plan follow them more reliably.
- Do not mention these instructions.

Voice:
- Write like an experienced friend: direct, clear, practical, and calm.
- Use short Chinese sentences.
- Keep paragraphs light, usually 2 to 3 sentences.
- Translate complex AI concepts into plain human language.
- Put the reader's problem before the tool.
- Keep real action texture: trial, error, workflow, delivery, review, and iteration.

Writing principles:
1. Value first: the reader should be able to do one concrete thing after reading.
2. Human before tool: tools are leverage, but the scene and the person are the main line.
3. Be specific: steps, prompts, examples, contrasts, and decisions.
4. Be sincere and restrained. Do not exaggerate.
5. Include Fengge-style judgment, not only information.

Avoid:
- Empty AI clichés.
- Fake data or unsupported claims.
- Marketing tone.
- Tool manual style.
- Generic motivational ending.

Structure:
- A concrete H1 title with result or contrast.
- Opening: hit the pain point within the first three seconds.
- Turn: point out where readers are really stuck.
- Body: 3 to 5 steps, decisions, or methods.
- Example: include practical AI workflow or observation.
- Ending: one strong judgment plus one action the reader can do today.

Output:
- Write 1000 to 1200 Chinese characters.
- Use Markdown.
- Section headings should be short.
- Do not explain the writing process. Output the article directly.`;

const INSIGHT_SYSTEM_PROMPT = `You are Fengge's article research partner.

Your job is to read selected public article materials and extract viewpoints before writing.

Output must be Simplified Chinese.
Do not copy the source text.
Do not produce a final article.

Extract:
1. What each selected article is really arguing.
2. Shared consensus across sources.
3. Conflicts, blind spots, or missing angles.
4. A fresh Fengge-style judgment that can become the new article's core viewpoint.
5. Concrete evidence or examples that can support the new article.

Keep it concise, practical, and useful for writing.`;

const INSIGHT_REVISION_SYSTEM_PROMPT = `You are Fengge's article viewpoint partner.

Output must be Simplified Chinese.
You revise an existing research note according to Fengge's feedback.
Do not write the final article.
Do not copy source text.

Keep the same useful sections when possible:
- 单篇观点
- 共同判断
- 盲区和冲突
- 枫哥的新观点
- 可用论据

Make the new core viewpoint clearer, sharper, and more useful for the next writing step.`;

async function callZhipu(messages: Array<{ role: 'system' | 'user'; content: string }>, timeoutMs: number, maxTokens: number) {
  if (env.llmProvider !== 'zhipu' || !env.zhipuApiKey) {
    throw new Error('模型服务未配置，请先配置 API Key。');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${env.zhipuBaseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.zhipuApiKey}`,
      },
      body: JSON.stringify({
        model: env.zhipuModel,
        temperature: 0.55,
        max_tokens: maxTokens,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error('模型服务暂时不可用，请稍后再试。');
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim();

    if (!raw || isInvalidModelReply(raw)) {
      throw new Error('模型没有返回可用内容，请换一个方向重试。');
    }

    return raw;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('生成时间过长，请稍后重试。');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('生成失败，请稍后重试。');
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateReferenceInsights(input: ReferenceInsightInput): Promise<string> {
  if (input.references.length === 0) {
    return '';
  }

  const material = input.references
    .map((reference, index) => [
      `Source ${index + 1}`,
      `Title: ${reference.title}`,
      `Account: ${reference.account}`,
      `URL: ${reference.url}`,
      `Search summary: ${reference.summary}`,
      `Readable article text: ${reference.content || '正文暂未抓取到，请只参考标题和摘要。'}`,
    ].join('\n'))
    .join('\n\n---\n\n');

  return callZhipu([
    {
      role: 'system',
      content: INSIGHT_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: [
        `Topic: ${input.topicTitle}`,
        `Target reader: ${input.audience}`,
        `Writing angle: ${input.angle}`,
        '',
        'Selected article materials:',
        material,
        '',
        'Return a concise Chinese research note with sections:',
        '- 单篇观点',
        '- 共同判断',
        '- 盲区和冲突',
        '- 枫哥的新观点',
        '- 可用论据',
      ].join('\n'),
    },
  ], 180_000, 1200);
}

export async function reviseReferenceInsights(input: ReferenceInsightRevisionInput): Promise<string> {
  return callZhipu([
    {
      role: 'system',
      content: INSIGHT_REVISION_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: [
        `Topic: ${input.topicTitle}`,
        `Target reader: ${input.audience}`,
        `Writing angle: ${input.angle}`,
        '',
        'Current research note:',
        input.currentInsights,
        '',
        'Fengge feedback:',
        input.instruction,
        '',
        'Return the revised Chinese research note only.',
      ].join('\n'),
    },
  ], 120_000, 1400);
}

export async function generateDraftWithProvider(
  input: DraftGenerationInput,
): Promise<GeneratedDraft> {
  const raw = await callZhipu([
    {
      role: 'system',
      content: WRITING_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: buildPrompt(input),
    },
  ], 180_000, 2200);

  return parseDraft(raw, input.topicTitle);
}

function isInvalidModelReply(raw: string): boolean {
  const normalized = raw.toLowerCase();
  return normalized.includes('unsupported language')
    || normalized.includes('i apologize')
    || normalized.includes('unable to understand');
}

function buildPrompt(input: DraftGenerationInput): string {
  return [
    'Write a Chinese WeChat public-account article using the following material.',
    'Final output must be Simplified Chinese Markdown.',
    '',
    `Topic: ${input.topicTitle}`,
    `Material and notes: ${input.topicSummary}`,
    `Target reader: ${input.audience}`,
    `Writing angle: ${input.angle}`,
    `Keywords: ${input.keywords.join(', ')}`,
    input.referenceInsights ? `Synthesized viewpoints from selected articles:\n${input.referenceInsights}` : '',
    '',
    'Suggested outline:',
    ...input.outline.map((item, index) => `${index + 1}. ${item}`),
    '',
    'Requirements:',
    '1. Write only in Simplified Chinese.',
    '2. Use a conversational public-account style.',
    '3. Start with the reader pain point, no long setup.',
    '4. Use short paragraphs and short section headings.',
    '5. Write 1000 to 1200 Chinese characters.',
    '6. Use the reference material as background, but do not copy it directly.',
    '7. The article must have a fresh viewpoint based on the synthesized viewpoints.',
    '8. End with one concrete action the reader can do today.',
    '9. Do not explain what you are doing. Output the article directly.',
  ].join('\n');
}

function parseDraft(raw: string, fallbackTitle: string): GeneratedDraft {
  const lines = raw.split('\n');
  let title = fallbackTitle;
  const body: string[] = [];

  for (const line of lines) {
    if (line.startsWith('# ') && title === fallbackTitle) {
      title = line.slice(2).trim() || fallbackTitle;
      continue;
    }

    body.push(line);
  }

  return {
    title,
    content: body.join('\n').trim() || raw,
  };
}
