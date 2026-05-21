import type { Article, HotSearchResult } from '@content-assistant/shared';
import { useEffect, useMemo, useState } from 'react';
import {
  createTopic,
  generateArticle,
  generateReferenceInsights,
  reviseReferenceInsights,
  searchHotTopics,
} from '../lib/api';
import { appPath } from '../lib/routes';

const pageStyle = {
  minHeight: '100vh',
  background: '#f7f7f4',
  color: '#18212f',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
} as const;

const shellStyle = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '28px 20px 40px',
} as const;

const navStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 28,
} as const;

const navLinksStyle = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
} as const;

const navLinkStyle = {
  color: '#374151',
  textDecoration: 'none',
  padding: '8px 10px',
  borderRadius: 6,
  fontSize: 14,
} as const;

const activeNavLinkStyle = {
  ...navLinkStyle,
  background: '#18212f',
  color: '#ffffff',
} as const;

const heroStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 360px',
  gap: 24,
  alignItems: 'stretch',
} as const;

const inputPanelStyle = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 24,
} as const;

const publishPanelStyle = {
  background: '#10231f',
  color: '#ffffff',
  borderRadius: 8,
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minHeight: 260,
} as const;

const textareaStyle = {
  width: '100%',
  minHeight: 156,
  resize: 'vertical',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: 16,
  fontSize: 17,
  lineHeight: 1.7,
  color: '#111827',
  background: '#ffffff',
  outline: 'none',
} as const;

const primaryButtonStyle = {
  border: 'none',
  borderRadius: 6,
  background: '#167c5c',
  color: '#ffffff',
  padding: '12px 18px',
  fontSize: 16,
  cursor: 'pointer',
  minWidth: 112,
} as const;

const quietButtonStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  background: '#ffffff',
  color: '#172033',
  padding: '12px 18px',
  fontSize: 16,
  cursor: 'pointer',
  minWidth: 112,
} as const;

const darkButtonStyle = {
  border: '1px solid rgba(255, 255, 255, 0.35)',
  borderRadius: 6,
  background: '#ffffff',
  color: '#10231f',
  padding: '12px 18px',
  fontSize: 16,
  cursor: 'pointer',
  textDecoration: 'none',
  textAlign: 'center',
} as const;

const resultsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 16,
  marginTop: 20,
} as const;

const resultPanelStyle = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 20,
  minHeight: 260,
} as const;

const mutedTextStyle = {
  color: '#667085',
  lineHeight: 1.7,
} as const;

type CreationStage =
  | 'idle'
  | 'working'
  | 'reviewing'
  | 'insighting'
  | 'confirmingInsight'
  | 'generating'
  | 'ready'
  | 'error';

const MAX_REFERENCE_SELECTION = 3;

function formatSelectedReferences(results: HotSearchResult[]) {
  if (results.length === 0) {
    return '';
  }

  return [
    '已选热点参考：',
    ...results.slice(0, 5).map((result, index) => (
      `${index + 1}. ${result.title}｜${result.account}｜${result.summary}｜${result.url}`
    )),
  ].join('\n');
}

function buildCreationInput(direction: string, results: HotSearchResult[] = []) {
  const cleanedDirection = direction.trim();
  const shortDirection = cleanedDirection.length > 42
    ? `${cleanedDirection.slice(0, 42)}...`
    : cleanedDirection;
  const references = formatSelectedReferences(results);

  return {
    title: shortDirection,
    summary: [
      `关于"${cleanedDirection}"的实战解读，讲清楚它是什么、能解决什么问题、普通人怎么用。`,
      references,
    ].filter(Boolean).join('\n\n'),
    audience: '想用 AI 提升行动效率的人',
    angle: results.length > 0
      ? '结合选中的热点参考，从真实场景切入，给出能直接照做的操作步骤'
      : '从真实场景切入，给出能直接照做的操作步骤',
    keywords: [
      cleanedDirection,
      ...results.slice(0, 3).map((result) => result.account),
      'AI实践',
      '内容创作',
    ].filter(Boolean),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '生成失败，请稍后重试。';
}

function getPublishVariant(article: Article | null) {
  return article?.variants.find((variant) => variant.platform === 'wechat')
    ?? article?.variants[0]
    ?? null;
}

const progressSteps: Array<{ key: CreationStage; label: string }> = [
  { key: 'working', label: '搜索热点' },
  { key: 'insighting', label: '提炼观点' },
  { key: 'confirmingInsight', label: '确认观点' },
  { key: 'generating', label: '生成正文' },
  { key: 'ready', label: '保存草稿' },
];

function getProgressIndex(stage: CreationStage, article: Article | null) {
  if (article || stage === 'ready') return 4;
  if (stage === 'generating') return 3;
  if (stage === 'confirmingInsight') return 2;
  if (stage === 'insighting') return 1;
  if (stage === 'reviewing' || stage === 'working') return 0;
  return -1;
}

function getStageHint(stage: CreationStage, message: string, elapsedSeconds: number): string {
  if (stage === 'working') {
    return `正在搜索热点素材，通常 3-15 秒（已用 ${elapsedSeconds} 秒）。`;
  }

  if (stage === 'reviewing') {
    return '热点搜索已完成，请确认最多 3 条参考后继续提炼观点。';
  }

  if (stage === 'insighting') {
    if (message.includes('修改观点')) {
      return `AI 正在按你的意见修改观点，通常 20-120 秒（已用 ${elapsedSeconds} 秒）。`;
    }
    return `AI 正在提炼观点，通常 20-120 秒（已用 ${elapsedSeconds} 秒）。`;
  }

  if (stage === 'confirmingInsight') {
    return '观点已生成，请确认、继续修改，或直接生成正文。';
  }

  if (stage === 'generating') {
    return `AI 正在生成正文，通常 30-180 秒（已用 ${elapsedSeconds} 秒）。`;
  }

  if (stage === 'ready') {
    return '草稿已保存，可以打开草稿继续编辑或去排版。';
  }

  if (stage === 'error') {
    return '当前阶段遇到问题，请重试。';
  }

  return '输入一个方向后开始创作。';
}

function getDynamicProgress(stage: CreationStage, article: Article | null, elapsedSeconds: number): number {
  if (article || stage === 'ready') return 100;
  if (stage === 'idle') return 0;
  if (stage === 'reviewing') return 30;
  if (stage === 'confirmingInsight') return 78;
  if (stage === 'error') return 15;

  if (stage === 'working') {
    return Math.min(25, 8 + elapsedSeconds * 2);
  }

  if (stage === 'insighting') {
    return Math.min(70, 35 + Math.log2(elapsedSeconds + 1) * 8);
  }

  if (stage === 'generating') {
    return Math.min(95, 80 + Math.log2(elapsedSeconds + 1) * 5);
  }

  return 0;
}

export default function Home() {
  const [direction, setDirection] = useState('');
  const [article, setArticle] = useState<Article | null>(null);
  const [hotResults, setHotResults] = useState<HotSearchResult[]>([]);
  const [stage, setStage] = useState<CreationStage>('idle');
  const [message, setMessage] = useState('');
  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(new Set());
  const [pendingTopicId, setPendingTopicId] = useState<string | null>(null);
  const [referenceInsights, setReferenceInsights] = useState('');
  const [insightInstruction, setInsightInstruction] = useState('');
  const [stageStartedAt, setStageStartedAt] = useState(() => Date.now());
  const [nowTick, setNowTick] = useState(() => Date.now());

  const creationInput = useMemo(
    () => (direction.trim() ? buildCreationInput(direction, hotResults) : null),
    [direction, hotResults],
  );
  const publishVariant = getPublishVariant(article);

  useEffect(() => {
    setStageStartedAt(Date.now());
  }, [stage]);

  useEffect(() => {
    if (stage !== 'working' && stage !== 'insighting' && stage !== 'generating') {
      return;
    }

    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [stage]);

  async function handleStartCreation() {
    if (!creationInput) {
      setMessage('先写下今天想表达的方向。');
      return;
    }

    setStage('working');
    setMessage('正在搜索热点。');

    try {
      const hotSearch = await searchHotTopics(direction);
      setHotResults(hotSearch.results);
      const autoSelected = new Set(hotSearch.results.slice(0, MAX_REFERENCE_SELECTION).map((r) => r.id));
      setSelectedResultIds(autoSelected);
      setStage('reviewing');
      setMessage(`找到 ${hotSearch.results.length} 条相关内容，请选择感兴趣的话题。`);
    } catch {
      setHotResults([]);
      setSelectedResultIds(new Set());
      setStage('reviewing');
      setMessage('在线搜索暂时不可用，可跳过选题选择直接生成。');
    }
  }

  function handleReset() {
    setArticle(null);
    setHotResults([]);
    setSelectedResultIds(new Set());
    setPendingTopicId(null);
    setReferenceInsights('');
    setInsightInstruction('');
    setStage('idle');
    setMessage('');
  }

  function toggleResult(id: string) {
    setSelectedResultIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_REFERENCE_SELECTION) {
          setMessage(`最多选择 ${MAX_REFERENCE_SELECTION} 篇文章作为参考观点。`);
          return prev;
        }
        next.add(id);
      }
      setMessage('');
      return next;
    });
  }

  async function handleConfirmSelection() {
    if (hotResults.length > 0 && selectedResultIds.size === 0) {
      setMessage('请至少选择一条相关内容。');
      return;
    }

    setStage('insighting');
    setMessage('AI 正在综合提炼新观点。');

    const selectedResults = hotResults.filter((r) => selectedResultIds.has(r.id));

    try {
      const topic = await createTopic(buildCreationInput(direction, selectedResults));
      setPendingTopicId(topic.id);
      const insights = await generateReferenceInsights(topic.id);
      setReferenceInsights(insights.referenceInsights || '没有可用参考正文，AI 会基于选题方向继续生成。');
      setInsightInstruction('');
      setStage('confirmingInsight');
      setMessage('观点已提炼，请确认后再生成正文。');
    } catch (error) {
      setPendingTopicId(null);
      setReferenceInsights('');
      setStage('reviewing');
      setMessage(`提炼观点失败：${getErrorMessage(error)}。可直接重试。`);
    }
  }

  async function handleRegenerateInsights() {
    if (!pendingTopicId) {
      await handleConfirmSelection();
      return;
    }

    setStage('insighting');
    setMessage('AI 正在换一个角度重新提炼。');

    try {
      const insights = await generateReferenceInsights(pendingTopicId);
      setReferenceInsights(insights.referenceInsights || '没有可用参考正文，AI 会基于选题方向继续生成。');
      setInsightInstruction('');
      setStage('confirmingInsight');
      setMessage('新的观点已提炼，请确认。');
    } catch (error) {
      setStage('confirmingInsight');
      setMessage(`修改观点失败：${getErrorMessage(error)}。可重试。`);
    }
  }

  async function handleReviseInsights() {
    if (!pendingTopicId || !referenceInsights.trim()) {
      setMessage('请先完成观点提炼。');
      return;
    }

    if (!insightInstruction.trim()) {
      setMessage('先写一句你想怎么改这个观点。');
      return;
    }

    const instruction = insightInstruction.trim();
    setStage('insighting');
    setMessage('AI 正在按你的意见修改观点。');

    try {
      const revised = await reviseReferenceInsights({
        topicId: pendingTopicId,
        currentInsights: referenceInsights,
        instruction,
      });
      setReferenceInsights(revised.referenceInsights);
      setInsightInstruction('');
      setStage('confirmingInsight');
      setMessage('观点已按你的意见修改。');
    } catch (error) {
      setStage('confirmingInsight');
      setMessage(getErrorMessage(error));
    }
  }

  async function handleGenerateArticle() {
    if (!pendingTopicId) {
      setMessage('请先完成观点提炼。');
      return;
    }

    setStage('generating');
    setMessage('AI 正在按确认后的观点生成正文。');

    try {
      const generatedArticle = await generateArticle(pendingTopicId, referenceInsights);
      setArticle(generatedArticle);
      setStage('ready');
      setMessage('文章已生成。');
    } catch (error) {
      setArticle(null);
      setStage('confirmingInsight');
      setMessage(`生成正文失败：${getErrorMessage(error)}。可重试。`);
    }
  }

  function openArticle(articleId: string) {
    window.location.href = appPath(`/articles/${articleId}`);
  }

  const progressIndex = getProgressIndex(stage, article);
  const elapsedSeconds = Math.max(0, Math.floor((nowTick - stageStartedAt) / 1000));
  const progressPercent = Math.round(getDynamicProgress(stage, article, elapsedSeconds));
  const stageHint = getStageHint(stage, message, elapsedSeconds);

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <nav data-v2-nav style={navStyle}>
          <strong style={{ fontSize: 20 }}>枫哥AI进化社内容工厂</strong>
          <div style={navLinksStyle}>
            <a href={appPath('/')} style={activeNavLinkStyle}>今日创作</a>
            <a href={appPath('/articles')} style={navLinkStyle}>作品草稿</a>
            <a href={appPath('/publish')} style={navLinkStyle}>发布</a>
          </div>
        </nav>

        <section data-v2-hero style={heroStyle}>
          <div style={inputPanelStyle}>
            <p style={{ margin: '0 0 8px', color: '#167c5c', fontWeight: 700 }}>
              今天写什么
            </p>
            <h1 data-v2-title style={{ margin: '0 0 18px', fontSize: 42, lineHeight: 1.15 }}>
              输入一个方向，直接得到一篇可继续打磨的文章。
            </h1>
            <textarea
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
              placeholder="例如：AI 编程普通人怎么开始；医生如何用提示词做知识管理；10 天训练营今天该讲什么"
              style={textareaStyle}
            />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
              {stage === 'reviewing' || stage === 'confirmingInsight' ? (
                <button
                  type="button"
                  onClick={stage === 'reviewing' ? handleConfirmSelection : handleGenerateArticle}
                  disabled={stage === 'reviewing' && hotResults.length > 0 && selectedResultIds.size === 0}
                  style={{
                    ...primaryButtonStyle,
                    opacity: stage === 'reviewing' && hotResults.length > 0 && selectedResultIds.size === 0 ? 0.72 : 1,
                  }}
                >
                  {stage === 'reviewing'
                    ? `提炼观点（已选 ${selectedResultIds.size} 条）`
                    : '用这个观点生成正文'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartCreation}
                  disabled={stage === 'working' || stage === 'insighting' || stage === 'generating'}
                  style={{
                    ...primaryButtonStyle,
                    opacity: stage === 'working' || stage === 'insighting' || stage === 'generating' ? 0.72 : 1,
                  }}
                >
                  {stage === 'working'
                    ? '搜索中...'
                    : stage === 'insighting'
                      ? '提炼中...'
                      : stage === 'generating'
                        ? '生成中...'
                        : '开始创作'}
                </button>
              )}
              {stage === 'confirmingInsight' ? (
                <button type="button" onClick={handleRegenerateInsights} style={quietButtonStyle}>
                  换一个角度
                </button>
              ) : null}
              <button type="button" onClick={handleReset} style={quietButtonStyle}>
                {stage === 'reviewing' ? '重新搜索' : '重新生成'}
              </button>
              {publishVariant ? (
                <a href={appPath('/publish')} style={{ ...quietButtonStyle, textDecoration: 'none' }}>
                  去排版
                </a>
              ) : null}
              {message ? <span style={{ alignSelf: 'center', color: '#475467' }}>{message}</span> : null}
            </div>
          </div>

          <aside data-v2-side-panel style={publishPanelStyle}>
            <div>
              <p style={{ margin: 0, color: '#9ee6c8', fontWeight: 700 }}>发布准备</p>
              <h2 style={{ margin: '12px 0', fontSize: 30, lineHeight: 1.2 }}>
                先把文章跑出来，再进入排版。
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7, color: '#d7f5e8' }}>
                主链路只保留写作和发布动作，封面图作为发布前的辅助材料处理。
              </p>
            </div>
            <a href={appPath('/publish')} style={darkButtonStyle}>去排版</a>
          </aside>
        </section>

        <section
          aria-label="创作进度"
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 16,
            marginTop: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <strong style={{ fontSize: 15 }}>创作进度</strong>
            <span style={{ color: '#667085', fontSize: 13 }}>{progressPercent}%</span>
          </div>
          <p style={{ margin: '8px 0 0', color: '#475467', fontSize: 13, lineHeight: 1.6 }}>
            {stageHint}
          </p>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: '#edf2f1',
              overflow: 'hidden',
              marginTop: 12,
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: '#167c5c',
                borderRadius: 999,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: 8,
              marginTop: 12,
            }}
          >
            {progressSteps.map((step, index) => {
              const completed = progressIndex >= index;
              const current = progressIndex === index;
            return (
              <div
                key={step.key}
                style={{
                  borderRadius: 6,
                  border: `1px solid ${completed ? '#167c5c' : '#e5e7eb'}`,
                  background: completed ? '#eefaf5' : '#ffffff',
                  color: completed ? '#167c5c' : '#667085',
                  fontSize: 13,
                  fontWeight: current ? 700 : 500,
                  padding: '9px 10px',
                  textAlign: 'center',
                }}
              >
                {step.label}
              </div>
            );
          })}
          </div>
        </section>

        <section data-v2-results style={resultsGridStyle}>
          <article style={resultPanelStyle}>
            <h2 style={{ marginTop: 0 }}>选题建议</h2>
            {stage === 'reviewing' ? (
              <>
                <p style={{ margin: '0 0 12px', color: '#667085', fontSize: 14 }}>
                  {hotResults.length > 0
                    ? `最多选择 ${MAX_REFERENCE_SELECTION} 篇作为参考观点（已选 ${selectedResultIds.size}/${MAX_REFERENCE_SELECTION}）`
                    : '未搜索到热点结果，可直接进入创作。'}
                </p>
                {hotResults.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {hotResults.map((result) => {
                      const selected = selectedResultIds.has(result.id);
                      return (
                        <div
                          key={result.id}
                          style={{
                            border: `1px solid ${selected ? '#167c5c' : '#e5e7eb'}`,
                            borderLeft: `3px solid ${selected ? '#167c5c' : '#e5e7eb'}`,
                            borderRadius: 8,
                            padding: 12,
                            background: selected ? '#f0faf6' : '#ffffff',
                            color: '#172033',
                            transition: 'all 0.12s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                flex: 1,
                                lineHeight: 1.5,
                                color: selected ? '#167c5c' : '#172033',
                                textDecoration: 'none',
                              }}
                            >
                              {result.title}
                            </a>
                            {selected ? (
                              <span style={{ color: '#167c5c', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>✓</span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: 12, color: '#667085', marginTop: 6 }}>
                            {result.source}｜{result.heat}
                          </div>
                          {result.summary ? (
                            <p style={{
                              fontSize: 13,
                              color: '#475467',
                              lineHeight: 1.5,
                              margin: '8px 0 0',
                              maxHeight: 39,
                              overflow: 'hidden',
                            }}>
                              {result.summary}
                            </p>
                          ) : null}
                          <div style={{ marginTop: 6 }}>
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: 12,
                                color: '#167c5c',
                                textDecoration: 'none',
                              }}
                            >
                              查看原文 ↗
                            </a>
                            <button
                              type="button"
                              onClick={() => toggleResult(result.id)}
                              disabled={!selected && selectedResultIds.size >= MAX_REFERENCE_SELECTION}
                              style={{
                                float: 'right',
                                border: `1px solid ${selected ? '#167c5c' : '#cbd5e1'}`,
                                borderRadius: 6,
                                background: selected ? '#167c5c' : '#ffffff',
                                color: selected ? '#ffffff' : '#172033',
                                cursor: !selected && selectedResultIds.size >= MAX_REFERENCE_SELECTION ? 'not-allowed' : 'pointer',
                                fontSize: 12,
                                padding: '4px 8px',
                                opacity: !selected && selectedResultIds.size >= MAX_REFERENCE_SELECTION ? 0.55 : 1,
                              }}
                            >
                              {selected ? '取消' : '选中'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : stage === 'insighting' ? (
              <p style={mutedTextStyle}>
                AI 正在阅读已选参考，提炼共同判断、盲区和新的表达角度。
              </p>
            ) : stage === 'confirmingInsight' ? (
              <>
                <h3 style={{ marginBottom: 8 }}>AI 综合提炼的新观点</h3>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.75,
                    background: '#f3f7f5',
                    borderRadius: 8,
                    padding: 12,
                    maxHeight: 330,
                    overflow: 'auto',
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
                  }}
                >
                  {referenceInsights}
                </pre>
                <p style={{ marginBottom: 0, color: '#475467', lineHeight: 1.7 }}>
                  确认这个观点后，再让 AI 按这个判断生成正文。
                </p>
                <textarea
                  value={insightInstruction}
                  onChange={(event) => setInsightInstruction(event.target.value)}
                  placeholder="不满意就直接说：再尖锐一点；更贴近医生场景；保留第二条但换成行动视角。"
                  style={{
                    ...textareaStyle,
                    minHeight: 96,
                    marginTop: 14,
                    fontSize: 15,
                  }}
                />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={handleReviseInsights}
                    style={{ ...primaryButtonStyle, fontSize: 15, padding: '10px 14px' }}
                  >
                    让 AI 修改观点
                  </button>
                </div>
              </>
            ) : creationInput ? (
              <>
                <h3 style={{ marginBottom: 8 }}>{creationInput.title}</h3>
                <p style={mutedTextStyle}>{creationInput.summary}</p>
                {hotResults.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                    {hotResults.slice(0, 3).map((result) => (
                      <a
                        key={result.id}
                        href={result.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          color: '#172033',
                          display: 'block',
                          padding: 10,
                          textDecoration: 'none',
                        }}
                      >
                        <strong style={{ display: 'block', marginBottom: 4 }}>{result.title}</strong>
                        <span style={{ color: '#667085', fontSize: 13 }}>
                          {result.source}｜{result.heat}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : null}
                <p style={{ marginBottom: 0, color: '#475467' }}>
                  角度：{creationInput.angle}
                </p>
              </>
            ) : (
              <p style={mutedTextStyle}>
                写下一个方向，马上得到今天最值得写的表达角度。
              </p>
            )}
          </article>

          <article style={resultPanelStyle}>
            <h2 style={{ marginTop: 0 }}>文章草稿</h2>
            {article ? (
              <>
                <h3 style={{ marginBottom: 8 }}>{article.title}</h3>
                <p style={{ ...mutedTextStyle, maxHeight: 148, overflow: 'hidden' }}>
                  {article.content}
                </p>
                <button
                  type="button"
                  onClick={() => openArticle(article.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#167c5c',
                    cursor: 'pointer',
                    fontWeight: 700,
                    padding: 0,
                  }}
                >
                  打开草稿
                </button>
              </>
            ) : (
              <p style={mutedTextStyle}>
                点击"开始创作"，直接得到完整正文的第一版。
              </p>
            )}
          </article>

          <article style={resultPanelStyle}>
            <h2 style={{ marginTop: 0 }}>发布准备</h2>
            {publishVariant ? (
              <>
                <h3 style={{ marginBottom: 8 }}>{publishVariant.title}</h3>
                <p style={mutedTextStyle}>
                  已准备好适合公众号继续排版的版本。封面图可在发布前补齐。
                </p>
                <a href={appPath('/publish')} style={{ color: '#167c5c', fontWeight: 700 }}>
                  去排版
                </a>
              </>
            ) : (
              <p style={mutedTextStyle}>
                草稿完成后，标题、正文和发布材料会一起准备好。
              </p>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
