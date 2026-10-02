import { useEffect, useMemo, useState } from 'react';
import { aiBrief, aiReview, getConfigStatus, getContentDetail, getContents, getOverview, setAdminToken, syncService } from './api';
import type { ConfigStatus, Content, Overview } from './types';

type View = 'dashboard' | 'content' | 'production' | 'integrations';

const fmt = new Intl.NumberFormat('th-TH');
const money = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });

function statusClass(status = '') {
  const s = status.toUpperCase();
  if (['POSTED', 'ANALYZED', 'APPROVED'].includes(s)) return 'good';
  if (['REVIEW', 'EDITING', 'SCHEDULED', 'READY TO SHOOT'].includes(s)) return 'warn';
  if (['OVERDUE', 'BLOCKED'].includes(s)) return 'bad';
  return 'neutral';
}

function productClass(product = '') {
  return product.toLowerCase().includes('boxing') ? 'boxing' : product.toLowerCase().includes('human') ? 'house' : 'corporate';
}

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [productFilter, setProductFilter] = useState('ALL');
  const [tokenOpen, setTokenOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [o, c, cfg] = await Promise.all([getOverview(), getContents(), getConfigStatus()]);
      setOverview(o);
      setContents(c);
      setConfig(cfg);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => contents.filter((c) => {
    const matchQ = !query || `${c.id} ${c.title} ${c.project || ''} ${c.owner || ''}`.toLowerCase().includes(query.toLowerCase());
    const matchProduct = productFilter === 'ALL' || c.product === productFilter;
    return matchQ && matchProduct;
  }), [contents, query, productFilter]);

  const openDetail = async (id: string) => {
    setSelected(id);
    setDetail(null);
    try { setDetail(await getContentDetail(id)); }
    catch (e) { setToast(e instanceof Error ? e.message : String(e)); }
  };

  const runSync = async (service: 'lark'|'meta'|'tiktok'|'all') => {
    setBusy(`sync-${service}`);
    try {
      await syncService(service);
      setToast(`Sync ${service.toUpperCase()} สำเร็จ`);
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    } finally { setBusy(''); }
  };

  const runAi = async (kind: 'review'|'brief', id: string) => {
    setBusy(`${kind}-${id}`);
    try {
      const result = kind === 'review' ? await aiReview(id) : await aiBrief(id);
      setToast(kind === 'review' ? 'AI Review เสร็จแล้ว' : 'AI Brief เสร็จแล้ว');
      if (kind === 'review') await openDetail(id);
      else alert(JSON.stringify(result.data, null, 2));
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    } finally { setBusy(''); }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const saveToken = () => {
    setAdminToken(tokenInput.trim());
    setTokenOpen(false);
    setToast('บันทึก Admin Token ใน session นี้แล้ว');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">VH</div>
          <div><strong>Visionhub</strong><span>Content Intelligence</span></div>
        </div>
        <nav>
          <NavButton active={view==='dashboard'} onClick={()=>setView('dashboard')} icon="⌂" label="Dashboard" />
          <NavButton active={view==='content'} onClick={()=>setView('content')} icon="▦" label="Content" />
          <NavButton active={view==='production'} onClick={()=>setView('production')} icon="◉" label="Production" />
          <NavButton active={view==='integrations'} onClick={()=>setView('integrations')} icon="↔" label="Integrations" />
        </nav>
        <div className="sidebar-foot">
          <button className="ghost wide" onClick={()=>setTokenOpen(true)}>Admin Token</button>
          <div className="mini-note">DEAL! × Visionhub<br/>October 2026</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">VISIONHUB OPERATING SYSTEM</div>
            <h1>{view === 'dashboard' ? 'Content Dashboard' : view === 'content' ? 'Content Library' : view === 'production' ? 'Production Control' : 'API Integrations'}</h1>
          </div>
          <div className="top-actions">
            <span className="date-pill">OCT 2026</span>
            <button className="ghost" onClick={()=>void load()}>Refresh</button>
            <button className="primary" onClick={()=>void runSync('all')} disabled={busy!==''}>{busy==='sync-all'?'Syncing...':'Sync All'}</button>
          </div>
        </header>

        {error && <div className="error-banner"><b>เชื่อม API ไม่ได้:</b> {error}<br/><small>เช็กว่า Backend เปิดอยู่ที่ VITE_API_BASE_URL และรัน D1 migration/seed แล้ว</small></div>}
        {loading && <div className="loading">กำลังโหลด Visionhub...</div>}

        {!loading && !error && view === 'dashboard' && overview && <Dashboard overview={overview} contents={contents} onOpen={openDetail} />}
        {!loading && !error && view === 'content' && <ContentLibrary contents={filtered} query={query} setQuery={setQuery} productFilter={productFilter} setProductFilter={setProductFilter} onOpen={openDetail} />}
        {!loading && !error && view === 'production' && overview && <Production overview={overview} contents={contents} onOpen={openDetail} />}
        {!loading && !error && view === 'integrations' && config && <Integrations config={config} busy={busy} onSync={runSync} />}
      </main>

      {selected && <DetailDrawer data={detail} onClose={()=>{setSelected(null);setDetail(null)}} onAi={runAi} busy={busy} />}

      {tokenOpen && <div className="modal-backdrop" onMouseDown={()=>setTokenOpen(false)}>
        <div className="modal" onMouseDown={(e)=>e.stopPropagation()}>
          <h3>Admin Token</h3>
          <p>ใส่ค่าเดียวกับ <code>DASHBOARD_ADMIN_TOKEN</code> ใน Cloudflare Secret ระบบจะเก็บแค่ sessionStorage ของ browser นี้</p>
          <input autoFocus type="password" value={tokenInput} onChange={(e)=>setTokenInput(e.target.value)} placeholder="••••••••••••" />
          <div className="modal-actions"><button className="ghost" onClick={()=>setTokenOpen(false)}>ยกเลิก</button><button className="primary" onClick={saveToken}>บันทึก</button></div>
        </div>
      </div>}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function NavButton({active,onClick,icon,label}:{active:boolean;onClick:()=>void;icon:string;label:string}) {
  return <button className={`nav-btn ${active?'active':''}`} onClick={onClick}><span>{icon}</span>{label}</button>;
}

function Dashboard({overview,contents,onOpen}:{overview:Overview;contents:Content[];onOpen:(id:string)=>void}) {
  const p = overview.performance || {};
  const posted = Number(overview.content.posted || 0);
  const total = Number(overview.content.total || 0);
  return <>
    <section className="kpi-grid">
      <Kpi label="Content Plan" value={fmt.format(total)} sub={`${posted} posted`} />
      <Kpi label="Relevant Reach" value={fmt.format(Number(p.reach||0))} sub={`${fmt.format(Number(p.views||0))} views`} />
      <Kpi label="Qualified Leads" value={fmt.format(Number(p.qualified_leads||0))} sub={`${fmt.format(Number(p.leads||0))} leads`} />
      <Kpi label="Revenue Influenced" value={money.format(Number(p.revenue||0))} sub={`${fmt.format(Number(p.closed||0))} closed`} />
      <Kpi label="DSLR Compliance" value={`${overview.camera.compliance}%`} sub={`${overview.camera.dslr_used}/${overview.camera.dslr_required} jobs`} accent={overview.camera.compliance<80?'bad':'good'} />
      <Kpi label="AI Quality" value={`${Number(overview.ai.avg_score||0).toFixed(1)}/10`} sub={`${overview.ai.reviews||0} reviews`} />
    </section>

    <section className="two-col">
      <div className="panel">
        <PanelTitle title="Production Pipeline" sub="ดูคอขวดของทีมจากสถานะงาน" />
        <div className="pipeline-list">
          {overview.statuses.map((s) => <div key={s.status} className="pipeline-row"><span>{s.status}</span><div className="bar"><i style={{width:`${Math.max(8, (Number(s.count)/Math.max(1,total))*100)}%`}}/></div><b>{s.count}</b></div>)}
        </div>
      </div>
      <div className="panel">
        <PanelTitle title="Business Funnel" sub="จาก Content/Ads ไปถึงยอดขาย" />
        <div className="funnel">
          <Funnel label="Leads" value={Number(p.leads||0)} max={Math.max(1,Number(p.leads||0))} />
          <Funnel label="Qualified" value={Number(p.qualified_leads||0)} max={Math.max(1,Number(p.leads||0))} />
          <Funnel label="Appointment" value={Number(p.appointments||0)} max={Math.max(1,Number(p.leads||0))} />
          <Funnel label="Closed" value={Number(p.closed||0)} max={Math.max(1,Number(p.leads||0))} />
        </div>
      </div>
    </section>

    <section className="two-col wide-left">
      <div className="panel">
        <PanelTitle title="Content ที่มี Business Impact" sub="เรียงจาก Qualified Lead ก่อน แล้วค่อย Views" />
        <div className="content-ranking">
          {overview.top_contents.map((c,idx)=><button key={c.id} className="rank-row" onClick={()=>onOpen(c.id)}>
            <span className="rank-no">{String(idx+1).padStart(2,'0')}</span>
            <span className={`product-dot ${productClass(c.product)}`}/>
            <span className="rank-main"><b>{c.title}</b><small>{c.id} · {c.product}</small></span>
            <span><small>Views</small><b>{fmt.format(Number(c.views||0))}</b></span>
            <span><small>Qualified</small><b>{fmt.format(Number(c.qualified_leads||0))}</b></span>
            <span><small>Revenue</small><b>{money.format(Number(c.revenue||0))}</b></span>
          </button>)}
        </div>
      </div>
      <div className="panel">
        <PanelTitle title="This Week" sub="งานที่กำลังจะลง" />
        <div className="upcoming">
          {overview.upcoming.slice(0,7).map(c=><button key={c.id} onClick={()=>onOpen(c.id)}>
            <span className={`product-chip ${productClass(c.product)}`}>{c.product}</span>
            <b>{c.title}</b>
            <small>{c.publish_date||'-'} · {c.owner||'Unassigned'}</small>
          </button>)}
        </div>
      </div>
    </section>

    <section className="panel">
      <PanelTitle title="Product Balance" sub="เช็ก Feed ไม่ให้ Human Allowed / Boxing หลุดสัดส่วน" />
      <div className="product-balance">{overview.products.map(p=><div key={p.product} className={`balance-card ${productClass(p.product)}`}><small>{p.product}</small><b>{p.count}</b><span>contents</span></div>)}</div>
    </section>
  </>;
}

function ContentLibrary({contents,query,setQuery,productFilter,setProductFilter,onOpen}:{contents:Content[];query:string;setQuery:(v:string)=>void;productFilter:string;setProductFilter:(v:string)=>void;onOpen:(id:string)=>void}) {
  return <section className="panel flush">
    <div className="filters">
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหา Content ID, ชื่อ, Owner..." />
      <select value={productFilter} onChange={e=>setProductFilter(e.target.value)}><option value="ALL">ทุก Product</option><option>Human Allowed</option><option>Boxing Kicking</option><option>Corporate</option></select>
      <span>{contents.length} records</span>
    </div>
    <div className="table-wrap"><table><thead><tr><th>Content</th><th>Product</th><th>Purpose</th><th>Production</th><th>Camera</th><th>Owner</th><th>Publish</th><th>Status</th></tr></thead><tbody>
      {contents.map(c=><tr key={c.id} onClick={()=>onOpen(c.id)}><td><b>{c.title}</b><small>{c.id} · {c.content_type||'-'}</small></td><td><span className={`product-chip ${productClass(c.product)}`}>{c.product}</span></td><td>{c.purpose||'-'}</td><td>{c.production_level||'-'}</td><td><span className={c.camera_required?.includes('DSLR') && !c.camera_used?.includes('DSLR') ? 'camera-miss':''}>{c.camera_required||'-'}<small>Used: {c.camera_used||'ยังไม่กรอก'}</small></span></td><td>{c.owner||'-'}</td><td>{c.publish_date||'-'}</td><td><span className={`status ${statusClass(c.status)}`}>{c.status}</span></td></tr>)}
    </tbody></table></div>
  </section>;
}

function Production({overview,contents,onOpen}:{overview:Overview;contents:Content[];onOpen:(id:string)=>void}) {
  const dslrMiss = contents.filter(c=>c.camera_required?.includes('DSLR') && c.camera_used && !c.camera_used.includes('DSLR'));
  const pendingCamera = contents.filter(c=>c.camera_required?.includes('DSLR') && !c.camera_used);
  return <>
    <section className="kpi-grid compact">
      <Kpi label="DSLR Required" value={String(overview.camera.dslr_required)} sub="งานที่ Brief บังคับ" />
      <Kpi label="DSLR Used" value={String(overview.camera.dslr_used)} sub="กรอกว่าใช้จริง" />
      <Kpi label="Compliance" value={`${overview.camera.compliance}%`} sub="เป้าหมาย ≥ 90%" accent={overview.camera.compliance>=90?'good':'bad'} />
      <Kpi label="Overdue" value={String(overview.content.overdue||0)} sub="เลยวัน Publish" accent={Number(overview.content.overdue||0)>0?'bad':'good'} />
    </section>
    <section className="two-col">
      <div className="panel"><PanelTitle title="DSLR Missing" sub="Brief กำหนด DSLR แต่ทีมกรอกว่าใช้กล้องอื่น" />
        <div className="issue-list">{dslrMiss.length?dslrMiss.map(c=><button key={c.id} onClick={()=>onOpen(c.id)}><span className="alert-dot"/><span><b>{c.title}</b><small>{c.id} · Required {c.camera_required} / Used {c.camera_used}</small></span></button>):<Empty text="ไม่มีงานผิด Brief"/>}</div>
      </div>
      <div className="panel"><PanelTitle title="Camera ยังไม่ถูกกรอก" sub="งาน HERO/DSLR ที่ยังไม่มี Camera Used" />
        <div className="issue-list">{pendingCamera.length?pendingCamera.map(c=><button key={c.id} onClick={()=>onOpen(c.id)}><span className="pending-dot"/><span><b>{c.title}</b><small>{c.id} · {c.status} · {c.shoot_date||'ไม่มีวันถ่าย'}</small></span></button>):<Empty text="ไม่มีงานรอกรอก"/>}</div>
      </div>
    </section>
    <section className="panel"><PanelTitle title="Production Board" sub="มองทีมแบบ workflow ไม่ใช่แค่ Calendar" />
      <div className="kanban">{['PLANNED','SCRIPT','READY TO SHOOT','EDITING','REVIEW','SCHEDULED','POSTED'].map(status=><div key={status} className="kanban-col"><div className="kanban-head"><b>{status}</b><span>{contents.filter(c=>c.status===status).length}</span></div>{contents.filter(c=>c.status===status).slice(0,8).map(c=><button key={c.id} onClick={()=>onOpen(c.id)}><span className={`product-line ${productClass(c.product)}`}/><b>{c.title}</b><small>{c.owner||'-'} · {c.publish_date||'-'}</small></button>)}</div>)}</div>
    </section>
  </>;
}

function Integrations({config,busy,onSync}:{config:ConfigStatus;busy:string;onSync:(s:'lark'|'meta'|'tiktok'|'all')=>void}) {
  const items = [
    {key:'lark',name:'Lark OpenAPI',desc:'Content Base, workflow, camera fields, owner, status',ok:config.lark},
    {key:'openai',name:'OpenAI API',desc:'Brief, Hook, Script, Content QA, Performance Intelligence',ok:config.openai},
    {key:'meta',name:'Meta APIs',desc:'Instagram organic + Ads insights',ok:config.meta},
    {key:'tiktok',name:'TikTok API',desc:'Video metadata + view/like/comment/share',ok:config.tiktok},
  ];
  return <>
    <section className="integration-grid">{items.map(i=><div key={i.key} className="integration-card"><div><span className={`integration-dot ${i.ok?'on':'off'}`}/><b>{i.name}</b></div><p>{i.desc}</p><span className={`config-state ${i.ok?'on':'off'}`}>{i.ok?'CONFIGURED':'NOT CONFIGURED'}</span>{['lark','meta','tiktok'].includes(i.key)&&<button className="ghost wide" onClick={()=>onSync(i.key as any)} disabled={!i.ok||busy!==''}>{busy===`sync-${i.key}`?'Syncing...':'Sync Now'}</button>}</div>)}</section>
    <section className="panel"><PanelTitle title="API Flow" sub="โครงสร้างที่ทีมใช้งานจริง" /><div className="flow-diagram"><div>Lark Base<small>Daily Operation</small></div><i>→</i><div className="strong">Visionhub API<small>Cloudflare Worker</small></div><i>→</i><div>OpenAI / Meta / TikTok<small>Analysis + Data</small></div><i>→</i><div>D1 + Dashboard<small>Intelligence</small></div></div></section>
    <section className="panel"><PanelTitle title="Checklist ก่อนขึ้น Production" /><div className="check-grid"><Check ok={config.admin_token} text="DASHBOARD_ADMIN_TOKEN"/><Check ok={config.lark} text="Lark App + Base IDs"/><Check ok={config.openai} text="OpenAI API Key"/><Check ok={config.meta} text="Meta Token + IG User ID"/><Check ok={config.meta_ads} text="Meta Ad Account ID"/><Check ok={config.tiktok} text="TikTok Access Token"/></div></section>
  </>;
}

function DetailDrawer({data,onClose,onAi,busy}:{data:any;onClose:()=>void;onAi:(k:'review'|'brief',id:string)=>void;busy:string}) {
  const c:Content|undefined=data?.content;
  const latest=data?.reviews?.[0];
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="drawer" onMouseDown={e=>e.stopPropagation()}><button className="drawer-close" onClick={onClose}>×</button>{!c?<div className="loading">กำลังโหลด...</div>:<>
    <div className="eyebrow">{c.id}</div><h2>{c.title}</h2><div className="drawer-tags"><span className={`product-chip ${productClass(c.product)}`}>{c.product}</span><span className={`status ${statusClass(c.status)}`}>{c.status}</span></div>
    <div className="detail-grid"><Detail label="Project" value={c.project}/><Detail label="Purpose" value={c.purpose}/><Detail label="Type" value={c.content_type}/><Detail label="Owner" value={c.owner}/><Detail label="Production" value={c.production_level}/><Detail label="Publish" value={c.publish_date}/><Detail label="Camera Required" value={c.camera_required}/><Detail label="Camera Used" value={c.camera_used||'ยังไม่กรอก'}/></div>
    <div className="drawer-actions"><button className="primary" onClick={()=>onAi('brief',c.id)} disabled={busy!==''}>{busy===`brief-${c.id}`?'Generating...':'AI Create Brief'}</button><button className="ghost" onClick={()=>onAi('review',c.id)} disabled={busy!==''}>{busy===`review-${c.id}`?'Reviewing...':'AI Review'}</button></div>
    <h3>AI Content QA</h3>{latest?<div className="score-card"><div className="big-score">{Number(latest.overall_score||0).toFixed(1)}<small>/10</small></div><div className="scores"><Score label="Hook" value={latest.hook_score}/><Score label="Clarity" value={latest.clarity_score}/><Score label="Proof" value={latest.proof_score}/><Score label="CTA" value={latest.cta_score}/><Score label="Brand" value={latest.brand_score}/><Score label="Visual" value={latest.visual_score}/></div><p>{latest.summary}</p><small>{parseRecommendations(latest.recommendations)}</small></div>:<Empty text="ยังไม่มี AI Review"/>}
    <h3>Platform Performance</h3><div className="perf-cards">{(data?.performance||[]).map((p:any)=><div key={`${p.platform}-${p.id}`}><b>{String(p.platform).toUpperCase()}</b><span>{fmt.format(Number(p.views||0))} views</span><span>{fmt.format(Number(p.reach||0))} reach</span><span>{fmt.format(Number(p.shares||0))} shares</span><span>{fmt.format(Number(p.qualified_leads||0))} qualified</span></div>)}</div>
  </>}</aside></div>;
}

function parseRecommendations(v:any){try{const a=typeof v==='string'?JSON.parse(v):v;return Array.isArray(a)?a.join(' · '):String(v||'');}catch{return String(v||'')}}
function Kpi({label,value,sub,accent}:{label:string;value:string;sub:string;accent?:string}){return <div className={`kpi ${accent||''}`}><small>{label}</small><b>{value}</b><span>{sub}</span></div>}
function PanelTitle({title,sub}:{title:string;sub?:string}){return <div className="panel-title"><div><h3>{title}</h3>{sub&&<p>{sub}</p>}</div></div>}
function Funnel({label,value,max}:{label:string;value:number;max:number}){return <div className="funnel-row"><span>{label}</span><div><i style={{width:`${Math.max(value?5:0,(value/max)*100)}%`}}/></div><b>{fmt.format(value)}</b></div>}
function Check({ok,text}:{ok:boolean;text:string}){return <div className={`check ${ok?'ok':''}`}><span>{ok?'✓':'!'}</span>{text}</div>}
function Detail({label,value}:{label:string;value:any}){return <div><small>{label}</small><b>{value||'-'}</b></div>}
function Score({label,value}:{label:string;value:any}){const n=Number(value||0);return <div><span>{label}</span><i><em style={{width:`${n*10}%`}}/></i><b>{n.toFixed(1)}</b></div>}
function Empty({text}:{text:string}){return <div className="empty">{text}</div>}

export default App;
