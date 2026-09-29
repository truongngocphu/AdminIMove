import React from 'react';
import { Activity, Database, MapPinned, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { getCoreConnection } from './coreApi.js';
import { gatewayUrl } from './apiRuntime.js';
import { trackAsiaConfig, usesTrackAsiaPublicTestKey } from './trackAsiaConfig.js';
import { PageError, PageLoading } from './AdminPageState.jsx';

export default function SettingsPage(){
  const [state,setState]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState('');

  const load=React.useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const core=await getCoreConnection(true);
      let gateway={success:false,message:'Admin Gateway chưa phản hồi'};
      try{
        const response=await fetch(gatewayUrl('/api/health'),{cache:'no-store'});
        gateway=await response.json().catch(()=>({success:false,message:`Gateway HTTP ${response.status}`}));
      }catch(e){
        gateway={success:false,message:e.message||String(e)};
      }
      setState({core,gateway});
    }catch(e){setError(e.message||String(e))}
    finally{setLoading(false)}
  },[]);

  React.useEffect(()=>{load()},[load]);
  if(loading&&!state)return <PageLoading text="Đang kiểm tra hệ thống..."/>;
  if(error&&!state)return <PageError message={error} onRetry={load}/>;

  return <section className="enterprise-page">
    <header className="enterprise-page-head"><div><span className="enterprise-eyebrow">SYSTEM CONFIGURATION</span><h1>Cài đặt hệ thống</h1><p>Admin 1.6.3 Vercel kết nối trực tiếp Core Backend VPS; Admin Gateway chạy trên VPS.</p></div><button className="button" onClick={load}><RefreshCw size={15}/>Kiểm tra lại</button></header>
    <div className="settings-health-grid">
      <article><Server/><span>Core Backend VPS</span><b>{state?.core?.connected?'Đã cấu hình':'Mất cấu hình'}</b><small>{state?.core?.baseUrl||'https://backendimove.daututh79.com'}</small></article>
      <article><Activity/><span>Admin Gateway VPS</span><b>{state?.gateway?.success===false?'Cảnh báo':'Hoạt động'}</b><small>{state?.gateway?.message||`Port ${state?.gateway?.adminPort||5060}`}</small></article>
      <article><Database/><span>MongoDB Atlas</span><b>{state?.gateway?.state===1?'Connected':'Qua Admin Gateway'}</b><small>{state?.gateway?.database||'th79_imove'}</small></article>
      <article><MapPinned/><span>TrackAsia</span><b>{usesTrackAsiaPublicTestKey()?'Test key':'Configured'}</b><small>{trackAsiaConfig.detailLevel||'enhanced'} · {trackAsiaConfig.styleUrl?'Custom style':'Streets v2'}</small></article>
    </div>
    <section className="card enterprise-panel"><header><div><h2>Production contract</h2><p>Frontend Vercel không dùng /api tương đối để tránh bị SPA rewrite thành index.html.</p></div><ShieldCheck size={18}/></header><div className="settings-contract"><code>Core: backendimove.daututh79.com</code><code>Gateway: /admin-gateway</code><code>Admin Gateway 5060</code><code>VITE_TRACKASIA_API_KEY</code></div></section>
  </section>;
}
