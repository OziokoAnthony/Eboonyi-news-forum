import { useEffect, useState } from 'react';
import { LayoutDashboard, Newspaper, FilePlus2, Clock3, Radio, LogOut, Plus, Pencil, Trash2, X, Eye, EyeOff, ShieldCheck, RefreshCw, ArrowLeft, Send, Upload, Link2, Play, ExternalLink, CalendarClock, CircleAlert, Image as ImageIcon } from 'lucide-react';
import { categories } from './data';

const API = 'http://localhost:8000';
const TOKEN_KEY = 'ebf_admin_token';

interface Article {
  id: number; title: string; slug: string; summary: string; body: string;
  category: string; article_type: string; author: string; source_note: string;
  image_url: string; video_url: string; lga_id: number | null; community_id: number | null;
  verified: boolean; published: boolean; scheduled_at: string | null; created_at: string;
}
interface Loc { id: number; name: string; slug: string; lga_id?: number | null }
interface LiveSession { id: number; title: string; url: string; is_active: boolean; started_at: string }
type View = 'dashboard' | 'posts' | 'editor' | 'schedule' | 'live' | 'branding';

interface FormState {
  title: string; slug: string; summary: string; body: string;
  category: string; article_type: string; author: string;
  source_note: string; image_url: string; video_url: string;
  lga_id: string; community_id: string; verified: boolean;
  mode: 'now' | 'draft' | 'schedule'; scheduledLocal: string;
}

const emptyForm: FormState = {
  title: '', slug: '', summary: '', body: '', category: 'Community', article_type: 'news',
  author: 'Editorial Desk', source_note: '', image_url: '', video_url: '',
  lga_id: '', community_id: '', verified: false, mode: 'draft', scheduledLocal: '',
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 240);
const absUrl = (u: string) => (!u || u.startsWith('http') || u.startsWith('data:') ? u : `${API}${u}`);
const parseUtc = (s: string) => new Date(s.replace(' ', 'T') + (s.includes('Z') ? '' : 'Z'));
const utcToLocalInput = (s: string) => {
  const d = parseUtc(s); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const localInputToUtc = (s: string) => (s ? new Date(s).toISOString().slice(0, 19) : null);
const fmt = (s: string) => parseUtc(s).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function embedSrc(url: string): string {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}
const isVideoFile = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);

function parseList<T>(raw: string | undefined, fallback: T[]): T[] {
  try {
    const v = raw ? JSON.parse(raw) : null;
    return Array.isArray(v) && v.length > 0 ? v : fallback;
  } catch { return fallback; }
}

const FEATURE_ICONS = ['Newspaper', 'Landmark', 'MapPin', 'Camera', 'Users', 'BookOpen', 'Mic', 'Film', 'Flag', 'Heart'];
const DEFAULT_FEATURES = [
  { icon: 'Newspaper', title: 'News & current affairs', sub: 'What is happening now' },
  { icon: 'Landmark', title: 'History & heritage', sub: 'Where our story began' },
  { icon: 'MapPin', title: 'Community reports', sub: 'Stories from every LGA' },
  { icon: 'Camera', title: 'Photos & documentaries', sub: 'Memories worth keeping' },
];
const DEFAULT_HISTORY = [
  { title: 'Origins & milestones', desc: 'The making of Ebonyi State' },
  { title: 'People & leadership', desc: 'Lives that shaped our story' },
  { title: 'Culture & traditions', desc: 'Language, festivals and heritage' },
  { title: 'Places & communities', desc: 'Our towns, villages and landmarks' },
];

function Player({ url }: { url: string }) {
  return isVideoFile(url)
    ? <video src={absUrl(url)} controls autoPlay className="aspect-video w-full bg-black" />
    : <iframe src={embedSrc(url)} title="player" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full bg-black" />;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [lgas, setLgas] = useState<Loc[]>([]);
  const [communities, setCommunities] = useState<Loc[]>([]);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [live, setLive] = useState<LiveSession | null>(null);
  const [liveForm, setLiveForm] = useState({ title: '', url: '' });
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [features, setFeatures] = useState<{ icon: string; title: string; sub: string }[]>([]);
  const [historyItems, setHistoryItems] = useState<{ title: string; desc: string }[]>([]);

  const authHeaders = { 'X-Admin-Token': token ?? '' };

  const loadAll = async () => {
    const [a, l, c, v, s] = await Promise.all([
      fetch(`${API}/api/admin/articles`, { headers: authHeaders }),
      fetch(`${API}/api/locations/lgas`),
      fetch(`${API}/api/locations/communities`),
      fetch(`${API}/api/live/active`),
      fetch(`${API}/api/admin/settings`, { headers: authHeaders }),
    ]);
    if (a.ok) setArticles(await a.json());
    if (l.ok) setLgas(await l.json());
    if (c.ok) setCommunities(await c.json());
    if (v.ok) setLive(await v.json());
    if (s.ok) {
      const d = await s.json();
      setSettings(d);
      setFeatures(parseList(d.features, DEFAULT_FEATURES));
      setHistoryItems(parseList(d.history_items, DEFAULT_HISTORY));
    }
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      const r = await fetch(`${API}/api/admin/session`, { headers: authHeaders });
      if (!r.ok) { setToken(null); sessionStorage.removeItem(TOKEN_KEY); return; }
      loadAll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async () => {
    setError('');
    const r = await fetch(`${API}/api/admin/session`, { headers: { 'X-Admin-Token': password } });
    if (r.ok) { sessionStorage.setItem(TOKEN_KEY, password); setToken(password); }
    else if (r.status === 500) setError('The server has no ADMIN_TOKEN configured.');
    else setError('Wrong password. Check the ADMIN_TOKEN in the backend .env file.');
  };

  const logout = () => { sessionStorage.removeItem(TOKEN_KEY); setToken(null); setArticles([]); };

  /* ---------------- editor ---------------- */
  const openNew = () => { setEditing(null); setForm(emptyForm); setError(''); setView('editor'); };
  const openEdit = (a: Article) => {
    setEditing(a);
    setForm({
      title: a.title, slug: a.slug, summary: a.summary, body: a.body,
      category: a.category, article_type: a.article_type, author: a.author,
      source_note: a.source_note, image_url: a.image_url, video_url: a.video_url,
      lga_id: a.lga_id == null ? '' : String(a.lga_id),
      community_id: a.community_id == null ? '' : String(a.community_id),
      verified: a.verified,
      mode: a.published ? 'now' : (a.scheduled_at ? 'schedule' : 'draft'),
      scheduledLocal: a.scheduled_at ? utcToLocalInput(a.scheduled_at) : '',
    });
    setError(''); setView('editor');
  };

  const setField = (k: keyof FormState, v: string | boolean) =>
    setForm(f => ({
      ...f,
      [k]: v,
      ...(k === 'title' && !editing ? { slug: slugify(String(v)) } : {}),
      ...(k === 'lga_id' ? { community_id: '' } : {}),
    }));

  const uploadFile = async (file: File, kind: 'image' | 'video') => {
    setUploading(kind);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${API}/api/admin/upload?kind=${kind}`, { method: 'POST', headers: authHeaders, body: fd });
    setUploading('');
    if (r.ok) { const d = await r.json(); setField(kind === 'image' ? 'image_url' : 'video_url', d.url); setNotice('Upload complete.'); }
    else { const e = await r.json().catch(() => null); setError(e?.detail ?? 'Upload failed.'); }
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) { setError('Title and body are required.'); return; }
    if (!form.slug.trim()) { setError('Slug is required.'); return; }
    if (form.mode === 'schedule' && !form.scheduledLocal) { setError('Pick the date and time to schedule the post.'); return; }
    setSaving(true); setError('');
    const payload: Record<string, unknown> = {
      title: form.title, slug: form.slug,
      summary: form.summary || form.body.slice(0, 180),
      body: form.body, category: form.category, article_type: form.article_type,
      author: form.author, source_note: form.source_note,
      image_url: form.image_url, video_url: form.video_url,
      lga_id: form.lga_id === '' ? null : Number(form.lga_id),
      community_id: form.community_id === '' ? null : Number(form.community_id),
      verified: form.verified,
      published: form.mode === 'now',
      scheduled_at: form.mode === 'schedule' ? localInputToUtc(form.scheduledLocal) : null,
    };
    const r = await fetch(`${API}/api/admin/articles${editing ? `/${editing.id}` : ''}`, {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (r.ok) {
      const saved = await r.json();
      setView('posts');
      setNotice(form.mode === 'schedule'
        ? `Scheduled — it will publish itself automatically on ${fmt(saved.scheduled_at)}.`
        : form.mode === 'now' ? 'Article published.' : 'Draft saved.');
      loadAll();
    } else {
      const d = await r.json().catch(() => null);
      setError(d?.detail ?? `Save failed (${r.status}).`);
    }
  };

  const togglePublish = async (a: Article) => {
    await fetch(`${API}/api/admin/articles/${a.id}/publish`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ published: !a.published }),
    });
    loadAll();
  };

  const cancelSchedule = async (a: Article) => {
    if (!confirm(`Cancel the schedule for "${a.title}"? It becomes a draft.`)) return;
    await fetch(`${API}/api/admin/articles/${a.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ ...a, published: false, scheduled_at: null }),
    });
    setNotice('Schedule cancelled — moved to drafts.');
    loadAll();
  };

  const remove = async (a: Article) => {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    await fetch(`${API}/api/admin/articles/${a.id}`, { method: 'DELETE', headers: authHeaders });
    setNotice('Article deleted.');
    loadAll();
  };

  /* ---------------- branding ---------------- */
  const setS = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }));
  const saveBranding = async () => {
    setError('');
    const r = await fetch(`${API}/api/admin/settings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ values: { ...settings, features: JSON.stringify(features), history_items: JSON.stringify(historyItems) } }),
    });
    if (r.ok) setNotice('Branding and site content saved — refresh the site to see it.');
    else setError('Could not save the branding.');
  };
  const saveBrandingKey = async (key: string, url: string) => {
    setError('');
    const r = await fetch(`${API}/api/admin/settings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ values: { [key]: url } }),
    });
    if (r.ok) { setSettings(s => ({ ...s, [key]: url })); setNotice(url ? 'Saved.' : 'Removed — the default shows again.'); }
    else setError('Could not save.');
  };
  const uploadBrandingImage = async (file: File, key: string) => {
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    const up = await fetch(`${API}/api/admin/upload?kind=image`, { method: 'POST', headers: authHeaders, body: fd });
    if (!up.ok) { const e = await up.json().catch(() => null); setError(e?.detail ?? 'Upload failed.'); return; }
    const d = await up.json();
    saveBrandingKey(key, d.url);
  };

  /* ---------------- live ---------------- */
  const startLive = async () => {
    if (!liveForm.title.trim() || !liveForm.url.trim()) { setError('A title and a stream URL are needed to go live.'); return; }
    setError('');
    const r = await fetch(`${API}/api/live/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(liveForm),
    });
    if (r.ok) { setLive(await r.json()); setNotice('You are LIVE — the banner is on the site now.'); }
    else setError('Could not start the live session.');
  };
  const endLive = async () => {
    if (!confirm('End the live stream now?')) return;
    await fetch(`${API}/api/live/end`, { method: 'POST', headers: authHeaders });
    setLive(null); setNotice('Live stream ended.');
  };

  /* ---------------- login ---------------- */
  if (!token) {
    return <div className="grid min-h-screen place-items-center bg-paper px-5">
      <div className="w-full max-w-sm border border-stone-200 bg-white p-10 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center bg-forest text-gold serif text-2xl">E</div>
          <div className="serif text-2xl">Editorial Admin</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[.25em] text-stone-400">Ebonyi News Forum</div>
        </div>
        {error && <div className="mb-4 border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        <div className="flex items-center gap-2 border border-stone-300 bg-paper px-3">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Admin password (ADMIN_TOKEN)" className="w-full bg-transparent py-3 text-sm outline-none" />
        </div>
        <button onClick={login} className="mt-4 w-full bg-forest py-3.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-ink">Sign in</button>
        <a href="#/" className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-forest"><ArrowLeft size={12} /> Back to the site</a>
      </div>
    </div>;
  }

  const published = articles.filter(a => a.published).length;
  const scheduled = articles.filter(a => !a.published && a.scheduled_at && parseUtc(a.scheduled_at) > new Date()).length;
  const drafts = articles.filter(a => !a.published && !(a.scheduled_at && parseUtc(a.scheduled_at) > new Date())).length;
  const upcoming = articles.filter(a => !a.published && a.scheduled_at && parseUtc(a.scheduled_at) > new Date()).sort((x, y) => parseUtc(x.scheduled_at!).getTime() - parseUtc(y.scheduled_at!).getTime());
  const statusOf = (a: Article) => {
    if (a.published) return { label: 'Live', cls: 'bg-forest text-white' };
    if (a.scheduled_at && parseUtc(a.scheduled_at) > new Date()) return { label: 'Scheduled', cls: 'bg-gold text-ink' };
    if (a.scheduled_at) return { label: 'Auto-published', cls: 'border border-forest text-forest' };
    return { label: 'Draft', cls: 'bg-stone-200 text-stone-600' };
  };
  const shown = articles.filter(a => `${a.title} ${a.category} ${a.article_type} ${a.author}`.toLowerCase().includes(query.toLowerCase()));

  const NAV: { id: View; icon: typeof LayoutDashboard; label: string; badge?: number | string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'posts', icon: Newspaper, label: 'All posts', badge: articles.length },
    { id: 'editor', icon: FilePlus2, label: 'New post' },
    { id: 'schedule', icon: CalendarClock, label: 'Scheduled', badge: scheduled || undefined },
    { id: 'live', icon: Radio, label: 'Go live', badge: live ? 'ON AIR' : undefined },
    { id: 'branding', icon: ImageIcon, label: 'Branding' },
  ];

  const go = (v: View) => { if (v === 'editor') openNew(); else setView(v); setSidebarOpen(false); };

  /* ---------------- dashboard shell ---------------- */
  return <div className="min-h-screen bg-paper">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink text-white transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        {settings.logo_url ? <img src={absUrl(settings.logo_url)} alt="logo" className="h-10 w-10 object-cover" /> : <div className="grid h-10 w-10 place-items-center bg-forest text-gold serif text-xl">E</div>}
        <div><div className="text-sm font-bold tracking-wide">EDITORIAL ADMIN</div><div className="text-[9px] font-bold uppercase tracking-[.25em] text-white/50">Ebonyi News Forum</div></div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map(n => <button key={n.id} onClick={() => go(n.id)}
          className={`flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold uppercase tracking-widest transition ${view === n.id ? 'bg-forest text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
          <n.icon size={16} /> {n.label}
          {n.badge && <span className={`ml-auto px-1.5 py-0.5 text-[9px] ${n.badge === 'ON AIR' ? 'animate-pulse bg-red-500 text-white' : 'bg-white/10'}`}>{n.badge}</span>}
        </button>)}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <a href="#/" className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white"><ExternalLink size={15} /> View site</a>
        <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white"><LogOut size={15} /> Log out</button>
      </div>
    </aside>
    {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

    <div className="md:pl-64">
      <div className="flex items-center gap-3 border-b border-stone-200 bg-white px-5 py-3 md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="border border-stone-300 p-2">☰</button>
        <span className="text-xs font-bold uppercase tracking-widest">Editorial admin</span>
      </div>

      <main className="mx-auto max-w-6xl px-5 py-8 md:px-10">
        {notice && <div className="mb-6 flex items-center gap-2 border border-forest/30 bg-forest/10 p-3 text-xs font-semibold text-forest"><ShieldCheck size={14} /> {notice}</div>}
        {error && <div className="mb-6 flex items-center gap-2 border border-red-200 bg-red-50 p-3 text-xs text-red-700"><CircleAlert size={14} /> {error}</div>}

        {/* ============ DASHBOARD ============ */}
        {view === 'dashboard' && <>
          <div className="mb-8"><div className="mb-2 text-[10px] font-bold uppercase tracking-[.25em] text-forest">Overview</div><h1 className="serif text-4xl">The <i>newsroom desk.</i></h1></div>
          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { n: articles.length, t: 'Total posts', c: 'text-ink' },
              { n: published, t: 'Live on site', c: 'text-forest' },
              { n: scheduled, t: 'Scheduled', c: 'text-gold' },
              { n: drafts, t: 'Drafts', c: 'text-stone-500' },
            ].map(s => <div key={s.t} className="border border-stone-200 bg-white p-6"><div className={`serif text-4xl ${s.c}`}>{s.n}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">{s.t}</div></div>)}
          </div>
          <div className="mb-8 flex flex-wrap gap-3">
            <button onClick={openNew} className="flex items-center gap-2 bg-forest px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-ink"><Plus size={15} /> New post</button>
            <button onClick={() => setView('live')} className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-widest ${live ? 'animate-pulse bg-red-500 text-white' : 'border border-stone-300 text-stone-600 hover:border-red-400 hover:text-red-600'}`}><Radio size={15} /> {live ? 'On air — manage' : 'Go live'}</button>
            <button onClick={() => loadAll()} className="flex items-center gap-2 border border-stone-300 px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-stone-600 hover:border-forest hover:text-forest"><RefreshCw size={15} /> Refresh</button>
          </div>
          <div className="border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">Recent posts</div>
            {articles.slice(0, 5).map(a => <div key={a.id} className="flex items-center gap-4 border-b border-stone-100 px-5 py-3.5 last:border-0">
              <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${statusOf(a).cls}`}>{statusOf(a).label}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{a.title}</span>
              <span className="hidden text-[10px] text-stone-400 sm:block">{a.category}</span>
              <button onClick={() => openEdit(a)} className="text-stone-400 hover:text-forest"><Pencil size={14} /></button>
            </div>)}
            {articles.length === 0 && <div className="px-5 py-10 text-center text-sm text-stone-400">No posts yet — create your first one.</div>}
          </div>
        </>}

        {/* ============ POSTS ============ */}
        {view === 'posts' && <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="serif text-3xl">All <i>posts.</i></h1>
            <button onClick={openNew} className="flex items-center gap-2 bg-forest px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-ink"><Plus size={14} /> New</button>
          </div>
          <div className="mb-4 flex items-center gap-3 border border-stone-200 bg-white px-4 py-3">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter posts..." className="w-full bg-transparent text-sm outline-none" />
          </div>
          <div className="border border-stone-200 bg-white">
            {shown.length === 0 && <div className="px-5 py-10 text-center text-sm text-stone-400">No posts found.</div>}
            {shown.map(a => <div key={a.id} className="grid gap-3 border-b border-stone-100 px-5 py-4 last:border-0 md:grid-cols-[1fr_120px_110px_120px_180px] md:items-center">
              <div className="min-w-0"><div className="truncate text-sm font-semibold">{a.title}</div><div className="mt-0.5 truncate text-[10px] text-stone-400">/{a.slug} · {a.author} · {fmt(a.created_at)}</div></div>
              <span className="text-xs text-stone-500">{a.category}</span>
              <span className={`w-fit px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${a.article_type === 'history' ? 'bg-ink text-gold' : 'bg-stone-100 text-stone-600'}`}>{a.article_type}</span>
              <div className="flex items-center gap-2"><span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${statusOf(a).cls}`}>{statusOf(a).label}</span>{a.verified && <ShieldCheck size={14} className="text-forest" />}</div>
              <div className="flex justify-end gap-2">
                <button onClick={() => togglePublish(a)} title={a.published ? 'Unpublish' : 'Publish now'} className="border border-stone-300 p-2 hover:border-forest hover:text-forest">{a.published ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                <button onClick={() => openEdit(a)} title="Edit" className="border border-stone-300 p-2 hover:border-forest hover:text-forest"><Pencil size={14} /></button>
                <button onClick={() => remove(a)} title="Delete" className="border border-stone-300 p-2 hover:border-red-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>)}
          </div>
        </>}

        {/* ============ SCHEDULED ============ */}
        {view === 'schedule' && <>
          <div className="mb-6"><h1 className="serif text-3xl">Scheduled <i>posts.</i></h1><p className="mt-2 text-sm text-stone-500">These publish themselves automatically at their date and time — nothing else to do.</p></div>
          {upcoming.length === 0 && <div className="border border-stone-200 bg-white px-5 py-10 text-center text-sm text-stone-400">Nothing scheduled. Choose “Schedule” when saving a post.</div>}
          {upcoming.map(a => <div key={a.id} className="mb-3 flex flex-wrap items-center gap-4 border border-stone-200 bg-white px-5 py-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center bg-gold/20 text-gold"><Clock3 size={18} /></div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{a.title}</div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">Goes live {fmt(a.scheduled_at!)}</div></div>
            <button onClick={() => openEdit(a)} className="border border-stone-300 p-2 hover:border-forest hover:text-forest" title="Edit"><Pencil size={14} /></button>
            <button onClick={() => cancelSchedule(a)} className="border border-stone-300 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-600 hover:border-red-400 hover:text-red-600">Cancel schedule</button>
          </div>)}
        </>}

        {/* ============ LIVE ============ */}
        {view === 'live' && <>
          <div className="mb-6"><h1 className="serif text-3xl">Go <i>live.</i></h1><p className="mt-2 text-sm text-stone-500">Paste a live stream URL (e.g. a YouTube live link) — a red LIVE banner with your stream appears on the site for every visitor until you end it.</p></div>
          {live ? <div className="border-2 border-red-500 bg-white">
            <div className="flex items-center gap-3 bg-red-500 px-5 py-3 text-white"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /><span className="text-xs font-bold uppercase tracking-widest">Live now</span><span className="truncate text-sm font-semibold">{live.title}</span><span className="ml-auto text-[10px] uppercase tracking-wider opacity-80">since {fmt(live.started_at)}</span></div>
            <div className="p-5"><Player url={live.url} /></div>
            <div className="flex justify-end border-t border-stone-200 p-4"><button onClick={endLive} className="bg-red-500 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-600">End stream</button></div>
          </div>
          : <div className="border border-stone-200 bg-white p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Broadcast title</span>
                <input value={liveForm.title} onChange={e => setLiveForm({ ...liveForm, title: e.target.value })} placeholder="e.g. Live: Independence Day parade, Abakaliki" className="w-full border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" /></label>
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Live stream URL</span>
                <div className="flex items-center gap-2 border border-stone-300 bg-paper px-3"><Link2 size={14} className="text-stone-400" />
                  <input value={liveForm.url} onChange={e => setLiveForm({ ...liveForm, url: e.target.value })} placeholder="https://youtube.com/live/..." className="w-full bg-transparent py-2.5 text-sm outline-none" /></div></label>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button onClick={startLive} className="flex items-center gap-2 bg-red-500 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-600"><Radio size={15} /> Start broadcasting</button>
              <span className="text-xs text-stone-400">Tip: start the stream on YouTube first, then paste its live URL here.</span>
            </div>
          </div>}
        </>}

        {/* ============ BRANDING ============ */}
        {view === 'branding' && (() => {
          const S = (k: string) => settings[k] ?? '';
          const field = (label: string, k: string, placeholder = '') => <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">{label}</span>
            <input value={S(k)} onChange={e => setS(k, e.target.value)} placeholder={placeholder} className="w-full border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" /></label>;
          const area = (label: string, k: string, rows = 2) => <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">{label}</span>
            <textarea value={S(k)} onChange={e => setS(k, e.target.value)} rows={rows} className="w-full resize-y border border-stone-300 bg-paper px-3 py-2.5 text-sm leading-6 outline-none focus:border-forest" /></label>;
          return <>
          <div className="mb-6"><h1 className="serif text-3xl">Branding <i>&amp; all sections.</i></h1><p className="mt-2 text-sm text-stone-500">Every word and image on the public site lives here. Leave a field empty to keep the built-in default. Tip: wrap words in *asterisks* in a title to render them in gold italic, and use new lines for multi-line headings.</p></div>
          <div className="border border-stone-200 bg-white">
            {/* logo */}
            <div className="border-b border-stone-200 p-6"><div className="mb-4 text-xs font-bold uppercase tracking-widest text-forest">Logo</div>
              <div className="grid items-start gap-6 md:grid-cols-[180px_1fr]">
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">Current logo</div>
                  <div className="grid h-24 w-24 place-items-center border border-stone-300 bg-paper">
                    {S('logo_url') ? <img src={absUrl(S('logo_url'))} alt="logo" className="h-full w-full object-cover" />
                      : <div className="grid h-16 w-16 place-items-center bg-forest text-gold serif text-3xl">{(S('site_name')[0] ?? 'E').toUpperCase()}</div>}
                  </div>
                </div>
                <div>
                  <label className="grid w-fit cursor-pointer place-items-center gap-1 border border-dashed border-stone-300 bg-paper px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:border-forest hover:text-forest">
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadBrandingImage(e.target.files[0], 'logo_url')} />
                    <Upload size={14} /> Upload logo file
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input value={S('logo_url')} onChange={e => setS('logo_url', e.target.value)} placeholder="...or paste a logo image URL" className="min-w-0 flex-1 border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" />
                    {S('logo_url') && <button onClick={() => saveBrandingKey('logo_url', '')} className="border border-stone-300 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:border-red-400 hover:text-red-600">Reset</button>}
                  </div>
                  <p className="mt-3 text-[10px] leading-5 text-stone-400">A square image works best (PNG with transparent background is ideal). Max 10 MB.</p>
                </div>
              </div>
            </div>

            {/* header & top bar */}
            <div className="border-b border-stone-200 p-6"><div className="mb-4 text-xs font-bold uppercase tracking-widest text-forest">Header &amp; top bar</div>
              <div className="grid gap-4 md:grid-cols-2">
                {field('Site name', 'site_name')}
                {field('Tagline (under the name)', 'site_tagline')}
                {field('Top bar text (left)', 'topbar_text')}
                {field('Top bar location (right)', 'topbar_location')}
              </div>
            </div>

            {/* hero */}
            <div className="border-b border-stone-200 p-6"><div className="mb-4 text-xs font-bold uppercase tracking-widest text-forest">Hero (top banner)</div>
              <div className="grid gap-4 md:grid-cols-2">
                {field('Small heading above title', 'hero_eyebrow')}
                {field('Primary button label', 'hero_cta_primary')}
                {area('Main title (one line per row, *gold italic* with asterisks)', 'hero_title', 3)}
                {field('Secondary button label', 'hero_cta_secondary')}
                <div className="md:col-span-2">{area('Hero paragraph', 'hero_subtitle', 2)}</div>
                <div className="md:col-span-2">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Background image</span>
                  <div className="flex flex-wrap gap-2">
                    <label className="grid cursor-pointer place-items-center gap-1 border border-dashed border-stone-300 bg-paper px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:border-forest hover:text-forest">
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadBrandingImage(e.target.files[0], 'hero_bg')} />
                      <Upload size={14} /> Upload image
                    </label>
                    <input value={S('hero_bg')} onChange={e => setS('hero_bg', e.target.value)} placeholder="...or paste an image URL" className="min-w-0 flex-1 border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" />
                    {S('hero_bg') && <button onClick={() => saveBrandingKey('hero_bg', '')} className="border border-stone-300 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:border-red-400 hover:text-red-600">Reset</button>}
                  </div>
                  {S('hero_bg') && <img src={absUrl(S('hero_bg'))} alt="" className="mt-2 max-h-28 object-cover" />}
                </div>
              </div>
            </div>

            {/* news feed */}
            <div className="border-b border-stone-200 p-6"><div className="mb-4 text-xs font-bold uppercase tracking-widest text-forest">News feed section</div>
              <div className="grid gap-4 md:grid-cols-2">{field('Section title', 'news_title')}{field('Section subtitle', 'news_subtitle')}</div>
            </div>

            {/* feature strip */}
            <div className="border-b border-stone-200 p-6"><div className="mb-4 text-xs font-bold uppercase tracking-widest text-forest">Feature strip (4 cards under the hero)</div>
              {features.map((f, i) => <div key={i} className="mb-3 grid gap-3 md:grid-cols-[150px_1fr_1fr]">
                <select value={f.icon} onChange={e => setFeatures(fs => fs.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))} className="border border-stone-300 bg-paper px-3 py-2.5 text-xs outline-none focus:border-forest">{FEATURE_ICONS.map(ic => <option key={ic}>{ic}</option>)}</select>
                <input value={f.title} onChange={e => setFeatures(fs => fs.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} className="border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" />
                <input value={f.sub} onChange={e => setFeatures(fs => fs.map((x, j) => j === i ? { ...x, sub: e.target.value } : x))} className="border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" />
              </div>)}
            </div>

            {/* history */}
            <div className="border-b border-stone-200 p-6"><div className="mb-4 text-xs font-bold uppercase tracking-widest text-forest">History archive section</div>
              <div className="grid gap-4 md:grid-cols-2">
                {area('Section title', 'history_title', 2)}
                <div />
                <div className="md:col-span-2">{area('Section paragraph', 'history_text', 3)}</div>
              </div>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {historyItems.map((h, i) => <div key={i} className="border border-stone-200 p-3">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Card 0{i + 1}</div>
                  <input value={h.title} onChange={e => setHistoryItems(hs => hs.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Card title" className="mb-2 w-full border border-stone-300 bg-paper px-3 py-2 text-sm outline-none focus:border-forest" />
                  <input value={h.desc} onChange={e => setHistoryItems(hs => hs.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} placeholder="Card description" className="w-full border border-stone-300 bg-paper px-3 py-2 text-sm outline-none focus:border-forest" />
                </div>)}
              </div>
            </div>

            {/* contribute */}
            <div className="border-b border-stone-200 p-6"><div className="mb-4 text-xs font-bold uppercase tracking-widest text-forest">Contribute section</div>
              <div className="grid gap-4 md:grid-cols-2">
                {field('Section title', 'contribute_title')}
                {field('Editorial email (button link)', 'contribute_email', 'editor@...')}
                <div className="md:col-span-2">{area('Section paragraph', 'contribute_text', 2)}</div>
              </div>
            </div>

            {/* footer */}
            <div className="p-6"><div className="mb-4 text-xs font-bold uppercase tracking-widest text-forest">Footer &amp; social</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">{area('About text', 'footer_about', 3)}</div>
                <div className="md:col-span-2">{area('Editorial values text', 'footer_values', 2)}</div>
                {field('Facebook URL', 'social_facebook', 'https://...')}
                {field('Instagram URL', 'social_instagram', 'https://...')}
                {field('YouTube URL', 'social_youtube', 'https://...')}
              </div>
              <p className="mt-3 text-[10px] text-stone-400">Leave a social URL empty to show the plain icon.</p>
            </div>

            {/* advertising */}
            <div className="border-t border-stone-200 p-6"><div className="mb-4 text-xs font-bold uppercase tracking-widest text-forest">Advertising (Google AdSense)</div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Ad slots</span>
                  <select value={S('ads_enabled') === '0' ? '0' : ''} onChange={e => setS('ads_enabled', e.target.value)} className="w-full border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest">
                    <option value="">Show ads on the public site</option>
                    <option value="0">Hide all ads</option>
                  </select></label>
                <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Maximum ad units per page (1–10)</span>
                  <input value={S('ads_max_per_page')} onChange={e => setS('ads_max_per_page', e.target.value.replace(/[^0-9]/g, ''))} placeholder="10" className="w-full border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" /></label>
              </div>
              <p className="mt-3 text-[10px] leading-5 text-stone-400">Up to 4 fixed slots (below the hero, above the feed, after the archive, above the footer) plus one unit woven in after every 3rd story. Your AdSense publisher ID lives in frontend/index.html (ca-pub-…). Google “Auto ads” are switched on from your AdSense dashboard — the loader here already supports them.</p>
            </div>
          </div>
          <div className="sticky bottom-0 mt-6 flex justify-end border border-stone-200 bg-white/95 p-4 backdrop-blur">
            <button onClick={saveBranding} className="flex items-center gap-2 bg-forest px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-ink"><Send size={13} /> Save all branding</button>
          </div>
          </>;
        })()}

        {/* ============ EDITOR ============ */}
        {view === 'editor' && <>
          <div className="mb-6 flex items-center gap-4">
            <button onClick={() => setView('posts')} className="border border-stone-300 p-2.5 text-stone-500 hover:border-forest hover:text-forest"><ArrowLeft size={16} /></button>
            <h1 className="serif text-3xl">{editing ? 'Edit post' : 'New <i>post.</i>'}</h1>
          </div>
          <div className="border border-stone-200 bg-white p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2 block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Title *</span>
                <input value={form.title} onChange={e => setField('title', e.target.value)} className="w-full border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" /></label>
              <label className="md:col-span-2 block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Slug (URL) *</span>
                <input value={form.slug} onChange={e => setField('slug', e.target.value)} className="w-full border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" /></label>

              {/* image */}
              <div className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Picture (upload or URL)</span>
                <div className="flex gap-2">
                  <label className="grid flex-1 cursor-pointer place-items-center gap-1 border border-dashed border-stone-300 bg-paper px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:border-forest hover:text-forest">
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'image')} />
                    <Upload size={14} /> {uploading === 'image' ? 'Uploading...' : 'Upload image'}
                  </label>
                  <input value={form.image_url} onChange={e => setField('image_url', e.target.value)} placeholder="https://..." className="min-w-0 flex-1 border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" />
                </div>
                {form.image_url && <img src={absUrl(form.image_url)} alt="" className="mt-2 max-h-32 object-cover" />}
              </div>

              {/* video */}
              <div className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Video (upload or URL)</span>
                <div className="flex gap-2">
                  <label className="grid flex-1 cursor-pointer place-items-center gap-1 border border-dashed border-stone-300 bg-paper px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:border-forest hover:text-forest">
                    <input type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'video')} />
                    <Upload size={14} /> {uploading === 'video' ? 'Uploading...' : 'Upload video'}
                  </label>
                  <input value={form.video_url} onChange={e => setField('video_url', e.target.value)} placeholder="YouTube link or https://...mp4" className="min-w-0 flex-1 border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" />
                </div>
                {form.video_url && <div className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-forest"><Play size={11} /> Video attached — <button onClick={() => setField('video_url', '')} className="underline">remove</button></div>}
              </div>

              <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Category</span>
                <select value={form.category} onChange={e => setField('category', e.target.value)} className="w-full border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest">{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Type</span>
                <select value={form.article_type} onChange={e => setField('article_type', e.target.value)} className="w-full border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"><option value="news">News</option><option value="history">History</option></select></label>
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Local Government Area</span>
                <select value={form.lga_id} onChange={e => setField('lga_id', e.target.value)} className="w-full border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"><option value="">— None —</option>{lgas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Community</span>
                <select value={form.community_id} onChange={e => setField('community_id', e.target.value)} className="w-full border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest disabled:opacity-50" disabled={form.lga_id === ''}>
                  <option value="">— None —</option>
                  {communities.filter(c => String(c.lga_id) === form.lga_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></label>
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Author</span>
                <input value={form.author} onChange={e => setField('author', e.target.value)} className="w-full border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" /></label>
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Source note (for historical records)</span>
                <input value={form.source_note} onChange={e => setField('source_note', e.target.value)} className="w-full border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" /></label>
              <label className="md:col-span-2 block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Summary</span>
                <textarea value={form.summary} onChange={e => setField('summary', e.target.value)} rows={2} placeholder="Leave empty to use the first lines of the body" className="w-full resize-y border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" /></label>
              <label className="md:col-span-2 block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Body *</span>
                <textarea value={form.body} onChange={e => setField('body', e.target.value)} rows={10} className="w-full resize-y border border-stone-300 bg-paper px-3 py-2.5 text-sm leading-6 outline-none focus:border-forest" /></label>
            </div>

            {/* publishing */}
            <div className="mt-6 border-t border-stone-100 pt-5">
              <span className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Publishing</span>
              <div className="grid gap-3 md:grid-cols-3">
                {([['now', 'Publish now', 'Visible on the site immediately'], ['schedule', 'Schedule', 'Publishes itself automatically later'], ['draft', 'Save as draft', 'Only visible here']] as const).map(([m, label, sub]) => (
                  <button key={m} onClick={() => setField('mode', m)}
                    className={`border p-4 text-left transition ${form.mode === m ? 'border-forest bg-forest/5' : 'border-stone-300 hover:border-stone-400'}`}>
                    <div className="text-xs font-bold uppercase tracking-wider">{label}</div>
                    <div className="mt-1 text-[10px] leading-4 text-stone-500">{sub}</div>
                  </button>
                ))}
              </div>
              {form.mode === 'schedule' && <div className="mt-4 flex items-center gap-3">
                <Clock3 size={16} className="text-gold" />
                <input type="datetime-local" value={form.scheduledLocal} onChange={e => setField('scheduledLocal', e.target.value)} className="border border-stone-300 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest" />
                <span className="text-[10px] text-stone-400">The post goes live on its own at this time.</span>
              </div>}
              <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.verified} onChange={e => setField('verified', e.target.checked)} className="accent-[#1d3f33]" /> <ShieldCheck size={14} className="text-forest" /> Editorially verified</label>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-stone-100 pt-5">
              <button onClick={() => setView('posts')} className="border border-stone-300 px-5 py-3 text-xs font-bold uppercase tracking-widest text-stone-600 hover:border-stone-500">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-forest px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-ink disabled:opacity-60"><Send size={13} /> {saving ? 'Saving...' : editing ? 'Save changes' : form.mode === 'schedule' ? 'Schedule post' : form.mode === 'now' ? 'Publish now' : 'Save draft'}</button>
            </div>
          </div>
        </>}
      </main>
    </div>
  </div>;
}
