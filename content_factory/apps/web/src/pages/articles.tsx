import type { GetServerSideProps } from 'next';
import type { Article } from '@content-assistant/shared';
import { fetchArticles } from '../lib/api';
import { appPath } from '../lib/routes';

type ArticlesPageProps = {
  articles: Article[];
};

const pageStyle = {
  minHeight: '100vh',
  background: '#f7f7f4',
  color: '#18212f',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
} as const;

const shellStyle = {
  maxWidth: 1080,
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
  borderRadius: 6,
  background: '#167c5c',
  color: '#ffffff',
  padding: '10px 14px',
  textDecoration: 'none',
  fontWeight: 700,
} as const;

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ArticlesPage({ articles }: ArticlesPageProps) {
  function openArticle(articleId: string) {
    window.location.href = appPath(`/articles/${articleId}`);
  }

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <nav data-v2-nav style={navStyle}>
          <strong style={{ fontSize: 20 }}>枫哥AI进化社内容工厂</strong>
          <div style={navLinksStyle}>
            <a href={appPath('/')} style={navLinkStyle}>今日创作</a>
            <a href={appPath('/articles')} style={activeNavLinkStyle}>作品草稿</a>
            <a href={appPath('/publish')} style={navLinkStyle}>发布</a>
          </div>
        </nav>

        <header style={{ marginBottom: 22 }}>
          <p style={{ margin: '0 0 8px', color: '#167c5c', fontWeight: 700 }}>
            作品草稿
          </p>
          <h1 data-v2-title style={{ margin: 0, fontSize: 38, lineHeight: 1.18 }}>
            已经写出的内容，都在这里继续打磨。
          </h1>
        </header>

        {articles.length === 0 ? (
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>还没有草稿</h2>
            <p style={{ color: '#667085', lineHeight: 1.7 }}>
              回到今日创作，输入一个方向，先跑出第一篇。
            </p>
            <a href={appPath('/')} style={buttonLinkStyle}>开始创作</a>
          </section>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {articles.map((article) => (
              <article key={article.id} style={cardStyle}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <h2 style={{ margin: '0 0 8px', fontSize: 24 }}>{article.title}</h2>
                    <p style={{ margin: 0, color: '#667085' }}>
                      {formatDate(article.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openArticle(article.id)}
                    style={{
                      ...buttonLinkStyle,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    打开草稿
                  </button>
                </div>
                <p
                  style={{
                    margin: '16px 0 0',
                    color: '#475467',
                    lineHeight: 1.7,
                    maxHeight: 86,
                    overflow: 'hidden',
                  }}
                >
                  {article.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<ArticlesPageProps> = async () => {
  try {
    const articles = await fetchArticles();
    return {
      props: {
        articles,
      },
    };
  } catch {
    return {
      props: {
        articles: [],
      },
    };
  }
};
