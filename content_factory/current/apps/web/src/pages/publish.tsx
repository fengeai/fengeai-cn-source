import { appPath } from '../lib/routes';

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

const panelStyle = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 22,
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

export default function PublishPage() {
  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <nav data-v2-nav style={navStyle}>
          <strong style={{ fontSize: 20 }}>枫哥AI进化社内容工厂</strong>
          <div style={navLinksStyle}>
            <a href="/" style={navLinkStyle}>回主页</a>
            <a href={appPath('/')} style={navLinkStyle}>今日创作</a>
            <a href={appPath('/articles')} style={navLinkStyle}>作品草稿</a>
            <a href={appPath('/publish')} style={activeNavLinkStyle}>发布</a>
          </div>
        </nav>

        <header style={{ marginBottom: 22 }}>
          <p style={{ margin: '0 0 8px', color: '#167c5c', fontWeight: 700 }}>
            发布
          </p>
          <h1 data-v2-title style={{ margin: 0, fontSize: 38, lineHeight: 1.18 }}>
            把草稿整理成可以发出去的版本。
          </h1>
        </header>

        <div data-v2-publish-grid style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>排版</h2>
            <p style={{ color: '#667085', lineHeight: 1.7 }}>
              从作品草稿进入文章，确认标题、开头、正文节奏，再复制到公众号编辑器。
            </p>
            <a href={appPath('/articles')} style={buttonLinkStyle}>作品草稿</a>
          </section>

          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>封面图</h2>
            <p style={{ color: '#667085', lineHeight: 1.7 }}>
              封面图作为发布前的辅助材料处理。先保证文章能发，再补视觉素材。
            </p>
            <a href={appPath('/')} style={buttonLinkStyle}>开始创作</a>
          </section>
        </div>
      </div>
    </main>
  );
}
