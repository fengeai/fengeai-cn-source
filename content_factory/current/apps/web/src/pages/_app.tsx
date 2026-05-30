import type { AppProps } from 'next/app';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  clearAccessCode,
  fetchAccessStatus,
  getStoredAccessCode,
  saveAccessCode,
  verifyAccessCode,
} from '../lib/api';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const [checking, setChecking] = useState(true);
  const [accessRequired, setAccessRequired] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const qrCodeSrc = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/fenge-wechat.webp`;

  useEffect(() => {
    let alive = true;

    async function boot() {
      trackVisit();

      try {
        const status = await fetchAccessStatus();
        if (!alive) return;

        setAccessRequired(status.enabled);
        if (!status.enabled) {
          setUnlocked(true);
          return;
        }

        const stored = getStoredAccessCode();
        if (!stored) {
          setUnlocked(false);
          return;
        }

        await verifyAccessCode(stored);
        if (!alive) return;
        setUnlocked(true);
      } catch {
        clearAccessCode();
        if (!alive) return;
        setUnlocked(false);
      } finally {
        if (alive) setChecking(false);
      }
    }

    boot();

    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();

    if (!trimmed) {
      setMessage('请输入访问码。');
      return;
    }

    setMessage('正在验证...');

    try {
      await verifyAccessCode(trimmed);
      saveAccessCode(trimmed);
      setUnlocked(true);
      setMessage('');
    } catch (error) {
      clearAccessCode();
      setMessage(error instanceof Error ? error.message : '访问码不正确，请添加枫哥微信获取访问码。');
    }
  }

  if (checking) {
    return <AccessShell title="正在进入内容工厂" message="正在检查访问权限..." />;
  }

  if (accessRequired && !unlocked) {
    return (
      <AccessShell title="内容工厂需要访问码" message="添加枫哥微信获取访问码。">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 20, alignItems: 'stretch' }}>
          <form onSubmit={handleSubmit} style={{ flex: '1 1 280px', display: 'grid', gap: 12, alignContent: 'start' }}>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="请输入访问码"
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 16,
                padding: '13px 14px',
              }}
            />
            <button
              type="submit"
              style={{
                border: 'none',
                borderRadius: 8,
                background: '#167c5c',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
                padding: '13px 14px',
              }}
            >
              进入内容工厂
            </button>
            {message ? <p style={{ margin: 0, color: '#b42318', lineHeight: 1.6 }}>{message}</p> : null}
          </form>
          <aside
            style={{
              flex: '0 1 220px',
              display: 'grid',
              justifyItems: 'center',
              gap: 10,
              padding: 14,
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              background: '#f8fafc',
              textAlign: 'center',
            }}
          >
            <img
              src={qrCodeSrc}
              alt="枫哥微信二维码"
              style={{
                width: 168,
                maxWidth: '100%',
                aspectRatio: '1 / 1',
                borderRadius: 8,
                background: '#fff',
              }}
            />
            <strong style={{ color: '#172033', fontSize: 15 }}>扫码添加枫哥微信</strong>
            <p style={{ margin: 0, color: '#667085', fontSize: 13, lineHeight: 1.6 }}>备注“内容工厂”，获取访问码。</p>
          </aside>
        </div>
      </AccessShell>
    );
  }

  return <Component {...pageProps} />;
}

function AccessShell({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f7f7f4',
        color: '#172033',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 760,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 24,
        }}
      >
        <p style={{ margin: '0 0 8px', color: '#167c5c', fontWeight: 700 }}>枫哥AI进化社</p>
        <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.18 }}>{title}</h1>
        <p style={{ margin: '12px 0 0', color: '#667085', lineHeight: 1.7 }}>{message}</p>
        {children}
      </section>
    </main>
  );
}

function trackVisit() {
  try {
    const key = 'fenge_visitor_id';
    let visitorId = window.localStorage.getItem(key);
    if (!visitorId) {
      visitorId = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(key, visitorId);
    }

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        path: window.location.pathname + window.location.search,
        title: document.title || '',
        referrer: document.referrer || '',
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
