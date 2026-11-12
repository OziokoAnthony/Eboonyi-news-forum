import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, Menu, MapPin, BookOpen, Newspaper, Landmark, Camera, Users, Mic, Film, Flag, Heart, ArrowUpRight, Mail, Facebook, Instagram, Youtube, ShieldCheck, X, Clock3, Play } from 'lucide-react';
import { lgas as LGA_NAMES, categories, stories } from './data';
import AdSlot from './AdSlot';

const API = 'http://localhost:8000';

interface ApiArticle {
  id: number; title: string; slug: string; summary: string; body: string;
  category: string; article_type: string; author: string; source_note: string;
  image_url: string; video_url: string; lga_id: number | null; community_id: number | null;
  verified: boolean; published: boolean; created_at: string;
}
interface Loc { id: number; name: string; slug: string; lga_id?: number | null }
interface FeedItem {
  title: string; excerpt: string; body?: string; category: string; lga: string;
  community: string; date: string; read: string; image: string; tag?: string;
  author?: string; source_note?: string; verified?: boolean; video?: string; demo?: boolean;
}
type Brand = Record<string, string>;

const ICONS: Record<string, typeof Newspaper> = { Newspaper, Landmark, MapPin, Camera, Users, BookOpen, Mic, Film, Flag, Heart };

const DEFAULT_HERO_BG = 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1800&q=85';
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
const DEFAULTS: Brand = {
  site_name: 'EBONYI NEWS FORUM',
  site_tagline: 'OUR STATE. OUR STORIES.',
  topbar_text: 'An independent archive of our state',
  topbar_location: 'ABAKALIKI · EBONYI STATE · NIGERIA',
  hero_eyebrow: "The people's archive",
  hero_title: 'Every story.\n*Every community.*\nOne Ebonyi.',
  hero_subtitle: 'From the pages of our history to the headlines shaping today. Discover, explore and preserve the stories of every corner of Ebonyi State.',
  hero_cta_primary: 'Explore the stories',
  hero_cta_secondary: 'Discover our history',
  hero_bg: '',
  news_title: 'Stories from *our state.*',
  news_subtitle: 'Every published story appears here for everyone — filter by a local government area if you wish.',
  history_title: 'Our past is not\n*a forgotten story.*',
  history_text: 'A dedicated record of the people, places, traditions and defining moments of Ebonyi State. Help preserve oral histories, photographs, documents and memories for the generations after us.',
  contribute_title: 'Have a story to tell?',
  contribute_text: 'Share a community report, historical photograph, personal account or correction with the editorial team.',
  contribute_email: 'editor@ebonyinewsforum.ng',
  footer_about: 'An independent digital platform dedicated to documenting the history, news, people and communities of Ebonyi State.',
  footer_values: 'Accuracy. Fairness. Respect for communities. Preservation of our shared heritage.',
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1000&q=85',
];

const absUrl = (u: string) => (!u || u.startsWith('http') || u.startsWith('data:') ? u : `${API}${u}`);
const isVideoFile = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
function embedSrc(url: string): string {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}
function Player({ url }: { url: string }) {
  return isVideoFile(url)
    ? <video src={absUrl(url)} controls className="aspect-video w-full bg-black" />
    : <iframe src={embedSrc(url)} title="video" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full bg-black" />;
}

// "*..."* lines render italic (with an optional colour class); \n becomes a line break.
function renderTitle(text: string, italicClass = '') {
  return text.split('\n').map((line, i) => {
    const m = line.match(/^\*(.+)\*$/);
    return <span key={i}>{i > 0 && <br />}{m ? <i className={italicClass}>{m[1]}</i> : line}</span>;
  });
}
function parseList<T>(raw: string | undefined, fallback: T[]): T[] {
  try {
    const v = raw ? JSON.parse(raw) : null;
    return Array.isArray(v) && v.length > 0 ? v : fallback;
  } catch { return fallback; }
}

export default function HomePage() {
  const [lga,setLga] = useState('All LGAs');
  const [category,setCategory] = useState('All topics');
  const [search,setSearch] = useState('');
  const [mobile,setMobile] = useState(false);
  const [apiArticles,setApiArticles] = useState<ApiArticle[] | null>(null);
  const [lgaList,setLgaList] = useState<Loc[]>([]);
  const [commList,setCommList] = useState<Loc[]>([]);
  const [active,setActive] = useState<FeedItem | null>(null);
  const [live,setLive] = useState<{ id: number; title: string; url: string } | null>(null);
  const [brand,setBrand] = useState<Brand>({});

  useEffect(() => {
    (async () => {
      try {
        const [a, l, c, b] = await Promise.all([
          fetch(`${API}/api/articles/?limit=100`),
          fetch(`${API}/api/locations/lgas`),
          fetch(`${API}/api/locations/communities`),
          fetch(`${API}/api/branding`),
        ]);
        if (a.ok) setApiArticles(await a.json());
        if (l.ok) setLgaList(await l.json());
        if (c.ok) setCommList(await c.json());
        if (b.ok) setBrand(await b.json());
      } catch { /* offline backend: demo stories remain visible */ }
    })();
  }, []);

  useEffect(() => {
    const check = () => fetch(`${API}/api/live/active`).then(r => r.ok ? r.json() : null)
      .then(d => setLive(d && d.id ? d : null)).catch(() => {});
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, []);

  const B: Brand = useMemo(() => {
    const out: Brand = { ...DEFAULTS };
    for (const [k, v] of Object.entries(brand)) if (v) out[k] = v;
    return out;
  }, [brand]);
  const features = parseList(B.features, DEFAULT_FEATURES);
  const historyItems = parseList(B.history_items, DEFAULT_HISTORY);
  /* ---- advertising (Google AdSense) ---- */
  const adsOn = B.ads_enabled !== '0';
  const adsMax = Math.min(10, Math.max(1, parseInt(B.ads_max_per_page || '10', 10) || 10));
  const showAd = (n: number) => adsOn && adsMax >= n;
  const inFeedAds = adsOn ? Math.max(0, adsMax - 4) : 0;
  const siteWords = B.site_name.split(' ');

  const feed: FeedItem[] = useMemo(() => {
    if (apiArticles && apiArticles.length > 0) {
      return apiArticles.map((a,i) => {
        const words = a.body.split(/\s+/).filter(Boolean).length;
        return {
          title: a.title,
          excerpt: a.summary || a.body.slice(0,180),
          body: a.body,
          category: a.category,
          lga: lgaList.find(x => x.id === a.lga_id)?.name ?? 'All LGAs',
          community: commList.find(x => x.id === a.community_id)?.name ?? 'Ebonyi State',
          date: new Date(a.created_at + 'Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
          read: `${Math.max(1, Math.round(words/200))} min read`,
          image: a.image_url || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
          tag: a.article_type === 'history' ? 'HISTORY & HERITAGE' : undefined,
          author: a.author,
          source_note: a.source_note,
          verified: a.verified,
          video: a.video_url || undefined,
        };
      });
    }
    return stories.map(s => ({ ...s, demo: true }));
  }, [apiArticles, lgaList, commList]);

  const usingDemo = feed.length > 0 && feed[0].demo === true;
  const dropdownLgas = lgaList.length > 0 ? ['All LGAs', ...lgaList.map(l => l.name)] : LGA_NAMES;

  const filtered = useMemo(()=>feed.filter(s=>(lga==='All LGAs'||s.lga===lga||s.lga==='All LGAs')&&(category==='All topics'||s.category===category)&&(`${s.title} ${s.excerpt} ${s.community} ${s.lga}`).toLowerCase().includes(search.toLowerCase())),[feed,lga,category,search]);

  // Feed cards with ad units woven in after every 3rd story (in-feed placement).
  const feedWithAd = useMemo<({ kind: 'story'; s: FeedItem } | { kind: 'ad'; n: number })[]>(() => {
    const out: ({ kind: 'story'; s: FeedItem } | { kind: 'ad'; n: number })[] = [];
    let adsUsed = 0;
    for (let i = 0; i < filtered.length; i++) {
      out.push({ kind: 'story', s: filtered[i] });
      if (adsUsed < inFeedAds && (i + 1) % 3 === 0) {
        adsUsed += 1;
        out.push({ kind: 'ad', n: 4 + adsUsed });
      }
    }
    return out;
  }, [filtered, inFeedAds]);

  return <div className="min-h-screen bg-paper">
    <div className="bg-ink text-white text-xs"><div className="mx-auto flex max-w-7xl justify-between px-5 py-2.5"><span className="tracking-[.18em] uppercase text-white/70">{B.topbar_text}</span><span className="hidden sm:block text-white/70">{B.topbar_location}</span></div></div>
    <header className="sticky top-0 z-30 border-b border-black/10 bg-paper/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
      <a href="#" className="flex items-center gap-3">{B.logo_url ? <img src={absUrl(B.logo_url)} alt="logo" className="h-11 w-11 object-cover" /> : <div className="grid h-11 w-11 place-items-center bg-forest text-gold serif text-2xl">{siteWords[0]?.[0] ?? 'E'}</div>}<div><div className="serif text-xl font-bold leading-none tracking-tight">{siteWords[0]} {siteWords.length > 1 && <span className="text-forest">{siteWords.slice(1).join(' ')}</span>}</div><div className="mt-1 text-[9px] font-bold tracking-[.25em] text-stone-500">{B.site_tagline}</div></div></a>
      <nav className={`${mobile?'absolute left-0 right-0 top-full flex flex-col border-b bg-paper p-5':'hidden'} gap-7 text-xs font-bold uppercase tracking-widest md:static md:flex md:flex-row md:border-0 md:bg-transparent md:p-0`}><a href="#news" className="hover:text-forest">Latest News</a><a href="#history" className="hover:text-forest">Our History</a><a href="#about" className="hover:text-forest">About</a></nav>
      <div className="flex items-center gap-3"><a href="#contribute" className="hidden bg-forest px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-ink sm:block">Submit a story <ArrowUpRight className="ml-2 inline" size={13}/></a><button onClick={()=>setMobile(!mobile)} className="md:hidden"><Menu/></button></div>
    </div></header>
    <main>
      <section className="relative overflow-hidden bg-ink text-white"><div className="absolute inset-0 opacity-25" style={{backgroundImage:`linear-gradient(90deg,#10231d 0%,transparent 100%),url(${B.hero_bg ? absUrl(B.hero_bg) : DEFAULT_HERO_BG})`,backgroundSize:'cover',backgroundPosition:'center'}}/><div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-[1.15fr_.85fr] md:py-28">
        <div className="max-w-2xl"><div className="mb-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.28em] text-gold"><span className="h-px w-9 bg-gold"/> {B.hero_eyebrow}</div><h1 className="serif text-5xl leading-[1.08] md:text-7xl">{renderTitle(B.hero_title, 'text-gold')}</h1><p className="mt-7 max-w-lg text-sm leading-7 text-white/70 md:text-base">{B.hero_subtitle}</p><div className="mt-9 flex flex-wrap gap-3"><a href="#news" className="bg-gold px-6 py-4 text-xs font-bold uppercase tracking-widest text-ink hover:bg-white">{B.hero_cta_primary} <ArrowRight className="ml-3 inline" size={15}/></a><a href="#history" className="border border-white/30 px-6 py-4 text-xs font-bold uppercase tracking-widest hover:bg-white/10">{B.hero_cta_secondary}</a></div></div>
        <div className="flex items-end justify-start md:justify-end"><div className="max-w-xs border-l border-gold/70 pl-6"><div className="serif text-5xl text-gold">13</div><div className="mt-1 text-xs font-bold uppercase tracking-[.2em]">Local Government Areas</div><p className="mt-3 text-xs leading-6 text-white/60">One shared identity, thousands of stories, countless communities worth remembering.</p></div></div>
      </div></section>
      {showAd(1) && <AdSlot slot="0000000001" className="mx-auto max-w-7xl px-5 pt-6" />}
      <section className="border-b border-stone-200 bg-white"><div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-stone-200 md:grid-cols-4">{features.map(x=>{const Icon = ICONS[x.icon] ?? Newspaper; return <div className="flex gap-3 px-5 py-6" key={x.title}><Icon className="mt-1 shrink-0 text-forest" size={20}/><div><div className="text-xs font-bold">{x.title}</div><div className="mt-1 text-[10px] text-stone-500">{x.sub}</div></div></div>;})}</div></section>
      <section id="news" className="mx-auto max-w-7xl px-5 py-20">{live && <div className="mb-12 border border-red-200 bg-white">
        <div className="flex items-center gap-3 bg-red-500 px-5 py-3 text-white"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white"/><span className="text-xs font-bold uppercase tracking-widest">Live</span><span className="truncate text-sm font-semibold">{live.title}</span></div>
        <div className="p-4"><Player url={live.url}/></div>
      </div>}<div className="mb-9 flex flex-wrap items-end justify-between gap-5"><div><div className="mb-3 text-[10px] font-bold uppercase tracking-[.25em] text-forest">The newsroom</div><h2 className="serif text-4xl md:text-5xl">{renderTitle(B.news_title)}</h2><p className="mt-3 text-sm text-stone-500">{B.news_subtitle}</p></div><span className="text-xs font-bold uppercase tracking-widest text-stone-400">{filtered.length} {filtered.length === 1 ? 'story' : 'stories'}</span></div>
        <div className="mb-8 grid gap-3 rounded-sm border border-stone-200 bg-white p-4 md:grid-cols-[1fr_220px_190px]"><div className="flex items-center gap-3 border-b border-stone-200 px-2 md:border-b-0"><Search size={18} className="text-stone-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stories, topics or communities..." className="w-full py-3 text-sm outline-none"/></div><label className="flex items-center gap-2 border-b border-stone-200 px-2 md:border-b-0 md:border-l md:pl-5"><MapPin size={16} className="text-forest"/><select value={lga} onChange={e=>setLga(e.target.value)} className="w-full bg-transparent py-3 text-xs font-semibold outline-none"><option>All LGAs</option>{dropdownLgas.filter(x=>x!=='All LGAs').map(x=><option key={x}>{x}</option>)}</select></label><label className="flex items-center gap-2 px-2 md:border-l md:pl-5"><BookOpen size={16} className="text-forest"/><select value={category} onChange={e=>setCategory(e.target.value)} className="w-full bg-transparent py-3 text-xs font-semibold outline-none">{categories.map(x=><option key={x}>{x}</option>)}</select></label></div>
        <div className="mb-5 flex flex-wrap gap-2">{categories.slice(1).map(c=><button key={c} onClick={()=>setCategory(category===c?'All topics':c)} className={`border px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${category===c?'border-forest bg-forest text-white':'border-stone-300 text-stone-600 hover:border-forest'}`}>{c}</button>)}</div>
        {apiArticles === null && <p className="py-10 text-center text-sm text-stone-400">Loading stories...</p>}
        {apiArticles !== null && filtered.length === 0 && <p className="py-10 text-center text-sm text-stone-400">No stories match this filter yet.</p>}
        {showAd(2) && <AdSlot slot="0000000002" className="mb-8" />}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{feedWithAd.map((it, i) => {
          if (it.kind === 'ad') return <AdSlot key={'ad-' + it.n} slot={'00000000' + String(it.n).padStart(2, '0')} className="sm:col-span-2 lg:col-span-3" />;
          const s = it.s;
          return <article key={s.title} className={`group overflow-hidden bg-white ${i===0?'sm:col-span-2 lg:col-span-2':''}`}>
          <button onClick={()=>setActive(s)} className="block w-full text-left"><div className={`relative overflow-hidden ${i===0?'h-72 md:h-96':'h-56'}`}><img src={s.image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute left-4 top-4 bg-gold px-3 py-2 text-[9px] font-bold tracking-widest text-ink">{s.tag||s.category.toUpperCase()}</span>{s.video && <span className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-ink/85 px-2.5 py-1.5 text-[9px] font-bold tracking-wider text-gold"><Play size={11}/> VIDEO</span>}{s.verified && <span className="absolute right-4 top-4 flex items-center gap-1 bg-white/90 px-2 py-1.5 text-[9px] font-bold tracking-wider text-forest"><ShieldCheck size={11}/> VERIFIED</span>}</div>
          <div className="p-6"><div className="mb-3 flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-stone-400"><span>{s.date}</span><span>·</span><span>{s.read}</span></div><h3 className={`serif leading-snug group-hover:text-forest ${i===0?'text-3xl md:text-4xl':'text-2xl'}`}>{s.title}</h3><p className="mt-3 text-sm leading-6 text-stone-500">{s.excerpt}</p><div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 text-[10px] font-bold uppercase tracking-wider text-stone-500"><span><MapPin className="mr-1 inline" size={12}/>{s.community}{s.lga !== 'All LGAs' && s.lga !== s.community ? ` · ${s.lga}` : ''}</span><span className="text-forest">Read story <ArrowRight className="ml-1 inline" size={13}/></span></div></div></button></article>;})}</div>
        {usingDemo && <p className="mt-5 text-xs text-stone-400">Showing sample placeholder stories. Publish articles in the admin panel and they will appear here for everyone automatically.</p>}
      </section>
      <section id="history" className="bg-forest text-white"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-2 md:items-center"><div><div className="mb-4 text-[10px] font-bold uppercase tracking-[.25em] text-gold">The living archive</div><h2 className="serif text-4xl leading-tight md:text-5xl">{renderTitle(B.history_title, 'text-gold')}</h2><p className="mt-6 max-w-lg text-sm leading-7 text-white/70">{B.history_text}</p><a href="#contribute" className="mt-8 inline-flex items-center bg-gold px-6 py-4 text-xs font-bold uppercase tracking-widest text-ink">Contribute to the archive <ArrowRight className="ml-3" size={15}/></a></div><div className="grid grid-cols-2 gap-3">{historyItems.map((x,i)=><div key={i} className="border border-white/20 p-6"><div className="mb-7 text-xs text-gold">0{i+1}</div><div className="serif text-xl">{x.title}</div><div className="mt-2 text-xs leading-5 text-white/50">{x.desc}</div></div>)}</div></div></section>
      {showAd(3) && <AdSlot slot="0000000003" className="mx-auto max-w-7xl px-5 py-6" />}
      <section id="contribute" className="mx-auto max-w-7xl px-5 py-16"><div className="flex flex-col justify-between gap-8 border-b border-stone-300 pb-14 md:flex-row md:items-center"><div><div className="mb-3 text-[10px] font-bold uppercase tracking-[.25em] text-forest">Be part of the record</div><h2 className="serif text-3xl md:text-4xl">{B.contribute_title}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-stone-500">{B.contribute_text}</p></div><a href={`mailto:${B.contribute_email}?subject=Story%20Submission`} className="inline-flex items-center justify-center bg-ink px-7 py-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-forest">Contact the editorial desk <ArrowUpRight className="ml-3" size={15}/></a></div></section>
    {showAd(4) && <AdSlot slot="0000000004" className="mx-auto max-w-7xl px-5" />}
    </main>
    <footer id="about" className="bg-ink text-white"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]"><div><div className="serif text-2xl">{B.site_name}</div><p className="mt-4 max-w-sm text-xs leading-6 text-white/50">{B.footer_about}</p><div className="mt-5 flex gap-4 text-white/60">{[['Facebook',Facebook,B.social_facebook],['Instagram',Instagram,B.social_instagram],['YouTube',Youtube,B.social_youtube]].map(([name,Icon,url],i)=>{const I=Icon as typeof Facebook; const u=(url as string)||''; return u ? <a key={name as string} href={u} target="_blank" rel="noreferrer" className="hover:text-white" title={name as string}><I size={17}/></a> : <span key={i}><I size={17}/></span>;})}</div></div><div><div className="mb-5 text-[10px] font-bold uppercase tracking-[.2em] text-gold">Explore</div><div className="space-y-3 text-xs text-white/60"><a className="block hover:text-white" href="#news">Latest news</a><a className="block hover:text-white" href="#history">History archive</a><a className="block hover:text-white" href="#contribute">Submit a story</a><a className="block hover:text-white" href="#/privacy">Privacy policy</a><a className="block hover:text-white" href="#/admin">Admin</a></div></div><div><div className="mb-5 text-[10px] font-bold uppercase tracking-[.2em] text-gold">Editorial values</div><p className="text-xs leading-6 text-white/60">{B.footer_values}</p><a href={`mailto:${B.contribute_email}`} className="mt-4 inline-flex items-center gap-2 text-xs text-gold"><Mail size={14}/> Contact us</a></div></div><div className="border-t border-white/10 py-5 text-center text-[10px] tracking-wider text-white/40">© {new Date().getFullYear()} {B.site_name}. {B.site_tagline}</div></footer>

    {active && <div className="fixed inset-0 z-40 overflow-y-auto bg-black/60 p-4" onClick={e => e.target === e.currentTarget && setActive(null)}>
      <div className="mx-auto max-w-3xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{active.tag || active.category.toUpperCase()}</span>
          <button onClick={()=>setActive(null)} className="p-1 text-stone-500 hover:text-ink"><X size={18}/></button>
        </div>
        {active.image && !active.video && <img src={active.image} alt="" className="max-h-96 w-full object-cover"/>}
        {active.video && <Player url={active.video}/>}
        <div className="p-6 md:p-10">
          <h2 className="serif text-3xl leading-snug md:text-4xl">{active.title}</h2>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-stone-100 pb-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">
            <span>{active.date}</span><span>·</span><span><Clock3 className="mr-1 inline" size={11}/>{active.read}</span>
            {active.author && <span>·</span>}<span>{active.author}</span>
            {active.verified && <span className="flex items-center gap-1 text-forest"><ShieldCheck size={12}/> Verified</span>}
          </div>
          <div className="mt-6 space-y-4 text-sm leading-7 text-stone-600">{(active.body || active.excerpt).split(/\n\s*\n/).map((p,j)=><p key={j}>{p}</p>)}</div>
          {active.source_note && <p className="mt-8 border-l-2 border-gold bg-stone-50 p-4 text-xs italic leading-5 text-stone-500"><b className="not-italic uppercase tracking-wider">Source:</b> {active.source_note}</p>}
          {active.demo && <p className="mt-8 border border-stone-200 bg-stone-50 p-4 text-xs text-stone-400">This is sample placeholder content. Stories published in the admin panel appear here in full.</p>}
        </div>
      </div>
    </div>}
  </div>;
}
