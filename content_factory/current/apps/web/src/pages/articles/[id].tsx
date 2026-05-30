import type { GetServerSideProps } from 'next';
import type { Article } from '@content-assistant/shared';
import { useState } from 'react';
import { fetchArticle } from '../../lib/api';
import { appPath } from '../../lib/routes';

type ArticleWorkspacePageProps = {
  article: Article | null;
};

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

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 20,
} as const;

const buttonLinkStyle = {
  display: 'inline-block',
  border: 'none',
  borderRadius: 6,
  background: '#167c5c',
  color: '#ffffff',
  padding: '10px 14px',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
} as const;

export default function ArticleWorkspacePage({ article }: ArticleWorkspacePageProps) {
  const [copyStatus, setCopyStatus] = useState('');

  if (!article) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>
          <h1>没有找到这篇草稿</h1>
          <p style={{ color: '#667085' }}>回到作品草稿，选择一篇已经写好的内容。</p>
          <a href={appPath('/articles')} style={buttonLinkStyle}>作品草稿</a>
        </div>
      </main>
    );
  }

  const currentArticle = article;

  async function copyMarkdown() {
    const markdown = `# ${currentArticle.title}\n\n${currentArticle.content}`;

    try {
      await navigator.clipboard.writeText(markdown);
      setCopyStatus('已复制');
    } catch {
      setCopyStatus('复制失败，请手动选择正文');
    }
  }

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <nav data-v2-nav style={navStyle}>
          <strong style={{ fontSize: 20 }}>枫哥AI进化社内容工厂</strong>
          <div style={navLinksStyle}>
            <a href="/" style={navLinkStyle}>回主页</a>
            <a href={appPath('/')} style={navLinkStyle}>今日创作</a>
            <a href={appPath('/articles')} style={activeNavLinkStyle}>作品草稿</a>
            <a href={appPath('/publish')} style={navLinkStyle}>发布</a>
          </div>
        </nav>

        <div
          data-v2-article-grid
          style={{
            maxWidth: 860,
            margin: '0 auto',
          }}
        >
          <section style={cardStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'flex-start',
                marginBottom: 18,
              }}
            >
              <h1 data-v2-title style={{ margin: 0, fontSize: 36, lineHeight: 1.18 }}>
                {currentArticle.title}
              </h1>
              <div style={{ display: 'grid', gap: 8, justifyItems: 'end', flexShrink: 0 }}>
                <button type="button" onClick={copyMarkdown} style={buttonLinkStyle}>
                  复制 Markdown
                </button>
                {copyStatus ? (
                  <span style={{ color: '#667085', fontSize: 13 }}>{copyStatus}</span>
                ) : null}
              </div>
            </div>

            <section>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.85,
                  background: '#f3f7f5',
                  padding: 16,
                  borderRadius: 8,
                  overflowX: 'auto',
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
                }}
              >
                {currentArticle.content}
              </pre>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<ArticleWorkspacePageProps> = async (
  context,
) => {
  const id = context.params?.id;

  if (typeof id !== 'string') {
    return {
      props: {
        article: null,
      },
    };
  }

  try {
    const article = await fetchArticle(id);
    return {
      props: {
        article,
      },
    };
  } catch {
    return {
      props: {
        article: null,
      },
    };
  }
};
