import React from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, Pause, Play, RotateCcw, SkipForward, Users, Zap } from 'lucide-react';

const FALLBACK_ROUNDS = [
  { radiusKm: 2, maxCandidates: 5, offerTimeoutSeconds: 7 },
  { radiusKm: 4, maxCandidates: 8, offerTimeoutSeconds: 7 },
  { radiusKm: 8, maxCandidates: 12, offerTimeoutSeconds: 9 },
  { radiusKm: 12, maxCandidates: 16, offerTimeoutSeconds: 10 },
];

const DEMO_DRIVERS = [
  { id:'A', x:57, y:47, km:0.8 },
  { id:'B', x:43, y:42, km:1.3 },
  { id:'C', x:61, y:59, km:1.8 },
  { id:'D', x:36, y:61, km:3.2 },
  { id:'E', x:68, y:35, km:3.7 },
  { id:'F', x:29, y:38, km:5.4 },
  { id:'G', x:76, y:65, km:7.1 },
  { id:'H', x:22, y:70, km:10.5 },
];

function number(value, fallback){
  const n=Number(value);return Number.isFinite(n)?n:fallback;
}
function normalizeRounds(policy){
  const raw=Array.isArray(policy?.dispatchRounds)&&policy.dispatchRounds.length?policy.dispatchRounds:FALLBACK_ROUNDS;
  return raw.slice(0,4).map((r,i)=>({
    radiusKm:Math.max(.5,number(r?.radiusKm,FALLBACK_ROUNDS[i]?.radiusKm||12)),
    maxCandidates:Math.max(1,Math.round(number(r?.maxCandidates,FALLBACK_ROUNDS[i]?.maxCandidates||16))),
    offerTimeoutSeconds:Math.max(3,Math.round(number(r?.offerTimeoutSeconds,FALLBACK_ROUNDS[i]?.offerTimeoutSeconds||10))),
  }));
}
function Box({children,style={}}){return <section style={{background:'#fff',border:'1px solid #e7e9ed',borderRadius:20,padding:18,boxShadow:'0 10px 30px rgba(16,24,40,.04)',...style}}>{children}</section>}
function Hint({title,children}){return <details style={{border:'1px solid #eceef2',borderRadius:12,padding:'9px 11px',background:'#fbfcfd'}}><summary style={{cursor:'pointer',fontSize:12,fontWeight:900,display:'flex',alignItems:'center',gap:6}}><CircleHelp size={14}/>{title}</summary><div style={{fontSize:12,lineHeight:1.55,color:'#646b75',paddingTop:7}}>{children}</div></details>}

export default function DispatchRoundSimulator({policy,onPolicyChange,canManage=true}){
  const rounds=normalizeRounds(policy);
  const [running,setRunning]=React.useState(false);
  const [roundIndex,setRoundIndex]=React.useState(0);
  const [phase,setPhase]=React.useState('SEARCH');
  const [accepted,setAccepted]=React.useState(false);
  const [tick,setTick]=React.useState(0);

  const maxRadius=Math.max(...rounds.map(r=>r.radiusKm),1);
  const current=rounds[Math.min(roundIndex,rounds.length-1)];
  const warnings=[];
  rounds.forEach((r,i)=>{
    if(i>0&&r.radiusKm<rounds[i-1].radiusKm)warnings.push(`Round ${i+1} có bán kính nhỏ hơn Round ${i}.`);
    if(r.offerTimeoutSeconds<4)warnings.push(`Round ${i+1} có timeout rất thấp.`);
    if(r.maxCandidates<1)warnings.push(`Round ${i+1} chưa có số ứng viên hợp lệ.`);
  });

  React.useEffect(()=>{
    if(!running)return undefined;
    const timer=setTimeout(()=>{
      setTick(t=>t+1);
      if(phase==='SEARCH'){setPhase('OFFER');return}
      if(phase==='OFFER'){
        if(roundIndex===1){setAccepted(true);setPhase('ASSIGNED');setRunning(false);return}
        if(roundIndex<rounds.length-1){setRoundIndex(v=>v+1);setPhase('SEARCH');return}
        setPhase('FALLBACK');setRunning(false);
      }
    },1300);
    return()=>clearTimeout(timer);
  },[running,phase,roundIndex,rounds.length,tick]);

  function reset(){setRunning(false);setRoundIndex(0);setPhase('SEARCH');setAccepted(false);setTick(0)}
  function next(){
    if(phase==='SEARCH'){setPhase('OFFER');return}
    if(phase==='OFFER'&&roundIndex<rounds.length-1){setRoundIndex(v=>v+1);setPhase('SEARCH');return}
    if(phase==='OFFER'){setPhase('FALLBACK');return}
    reset();
  }
  function updateRound(index,key,value){
    const next=normalizeRounds(policy);next[index]={...next[index],[key]:value};
    const nextPolicy={...(policy||{}),dispatchRounds:next,maxRadiusKm:Math.max(...next.map(r=>Number(r.radiusKm)||0))};
    onPolicyChange?.(nextPolicy);
  }
  const statusText=accepted?'Đã tìm thấy tài xế':phase==='OFFER'?`Đang gửi offer Round ${roundIndex+1}`:phase==='FALLBACK'?'Chuyển sang manual fallback':`Đang quét Round ${roundIndex+1}`;

  return <Box style={{marginBottom:14}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
      <div><div style={{fontSize:11,fontWeight:900,letterSpacing:'.08em',color:'#d71920'}}>DISPATCH ROUND SIMULATOR</div><h2 style={{margin:'5px 0 3px',fontSize:20}}>Mô phỏng cách hệ thống tìm tài xế</h2><p style={{margin:0,color:'#7b818b',fontSize:12}}>Chế độ mô phỏng chỉ giải thích và preview cấu hình, không tạo booking hoặc phát offer thật.</p></div>
      <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
        <button className="button" onClick={reset}><RotateCcw size={15}/> Reset</button>
        <button className="button" onClick={next}><SkipForward size={15}/> Bước tiếp</button>
        <button className="button button-primary" onClick={()=>setRunning(v=>!v)}>{running?<Pause size={15}/>:<Play size={15}/>} {running?'Tạm dừng':'Chạy mô phỏng'}</button>
      </div>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'minmax(420px,1.25fr) minmax(320px,.75fr)',gap:14,marginTop:15,alignItems:'stretch'}}>
      <div style={{position:'relative',minHeight:390,border:'1px solid #eceff3',borderRadius:18,overflow:'hidden',background:'radial-gradient(circle at 50% 50%, #fff 0, #fafbfc 60%, #f3f5f7 100%)'}}>
        <div style={{position:'absolute',left:16,top:14,zIndex:20,background:'#fff',border:'1px solid #eceef1',borderRadius:12,padding:'8px 10px',boxShadow:'0 8px 20px rgba(16,24,40,.06)'}}><div style={{fontSize:11,color:'#7a818b'}}>Trạng thái mô phỏng</div><b style={{fontSize:13,color:accepted?'#137a43':'#d71920'}}>{statusText}</b></div>
        {rounds.map((r,i)=>{
          const size=Math.max(90,(r.radiusKm/maxRadius)*330);const active=i===roundIndex&&!accepted;
          return <div key={i} style={{position:'absolute',left:'50%',top:'52%',width:size,height:size,transform:'translate(-50%,-50%)',borderRadius:'50%',border:`${active?3:1}px solid ${active?'#d71920':'#d9dde3'}`,background:active?'rgba(215,25,32,.035)':'transparent',transition:'all .55s cubic-bezier(.2,.8,.2,1)',boxShadow:active?'0 0 0 10px rgba(215,25,32,.035)':'none'}}><span style={{position:'absolute',right:8,top:'50%',fontSize:10,fontWeight:900,color:active?'#d71920':'#a1a6ae',background:'#fff',padding:'2px 5px',borderRadius:7}}>R{i+1} · {r.radiusKm}km</span></div>
        })}
        <div style={{position:'absolute',left:'50%',top:'52%',transform:'translate(-50%,-50%)',zIndex:15,width:56,height:56,borderRadius:18,display:'grid',placeItems:'center',background:'#111827',color:'#fff',fontWeight:900,boxShadow:'0 12px 26px rgba(17,24,39,.24)'}}>USER</div>
        {DEMO_DRIVERS.map((d,index)=>{
          const inRange=d.km<=current.radiusKm;const offered=phase==='OFFER'&&inRange&&index<current.maxCandidates;const winner=accepted&&d.id==='B';
          const blocked=d.id==='C';
          const bg=winner?'#137a43':blocked?'#c62828':offered?'#f59e0b':inRange?'#1f9d61':'#9aa1aa';
          return <div key={d.id} title={`Driver ${d.id} · ${d.km} km`} style={{position:'absolute',left:`${d.x}%`,top:`${d.y}%`,transform:'translate(-50%,-50%)',zIndex:18,width:winner?42:34,height:winner?42:34,borderRadius:'50%',display:'grid',placeItems:'center',background:bg,color:'#fff',fontSize:11,fontWeight:900,border:'3px solid #fff',boxShadow:offered||winner?'0 0 0 7px rgba(245,158,11,.13),0 8px 18px rgba(16,24,40,.14)':'0 6px 14px rgba(16,24,40,.12)',transition:'all .35s ease'}}>D{d.id}</div>
        })}
        <div style={{position:'absolute',left:16,bottom:14,right:16,display:'flex',gap:8,flexWrap:'wrap',fontSize:11}}>
          {[['#1f9d61','Đủ điều kiện'],['#f59e0b','Đang nhận offer'],['#9aa1aa','Ngoài bán kính'],['#c62828','Bị loại'],['#137a43','Đã nhận cuốc']].map(([c,l])=><span key={l} style={{display:'inline-flex',alignItems:'center',gap:5,background:'#fff',border:'1px solid #eceef1',borderRadius:999,padding:'5px 8px'}}><i style={{width:8,height:8,borderRadius:'50%',background:c}}/>{l}</span>)}
        </div>
      </div>

      <div style={{display:'grid',gap:10,alignContent:'start'}}>
        <div style={{padding:13,borderRadius:14,background:'#fff7f7',border:'1px solid #ffdadd'}}><div style={{display:'flex',alignItems:'center',gap:7,fontWeight:900,color:'#9e1b23'}}><Zap size={16}/> Dispatch Round là gì?</div><p style={{fontSize:12,lineHeight:1.55,color:'#6d4448',margin:'7px 0 0'}}>Hệ thống ưu tiên tài xế gần khách trước. Nếu chưa có người nhận, bán kính được mở rộng theo từng Round để tăng khả năng ghép cuốc mà không phát quá xa ngay từ đầu.</p></div>
        <Hint title="Bán kính tìm kiếm">Bán kính nhỏ giúp ETA tốt hơn nhưng có thể thiếu tài xế. Round sau nên bằng hoặc lớn hơn Round trước.</Hint>
        <Hint title="Số ứng viên">Là giới hạn tài xế được lấy vào danh sách xét trong Round. Cấu hình quá thấp có thể bỏ lỡ tài xế phù hợp; quá cao làm tăng xử lý không cần thiết.</Hint>
        <Hint title="Offer Timeout">Là thời gian chờ phản hồi trước khi hệ thống mở rộng vòng tìm kiếm hoặc phát cho ứng viên tiếp theo.</Hint>
        <Hint title="GPS Freshness">Chỉ tài xế có vị trí đủ mới mới nên tham gia matching để tránh phát cuốc cho người đã rời khu vực.</Hint>
        {warnings.length>0&&<div style={{padding:11,borderRadius:12,background:'#fff8e8',border:'1px solid #ffe1a3',color:'#8a5a00',fontSize:12}}><div style={{fontWeight:900,display:'flex',gap:6,alignItems:'center'}}><AlertTriangle size={15}/> Cảnh báo cấu hình</div>{warnings.map(w=><div key={w} style={{marginTop:5}}>• {w}</div>)}</div>}
        {!warnings.length&&<div style={{padding:10,borderRadius:12,background:'#edf9f1',border:'1px solid #cdeed8',color:'#137a43',fontSize:12,fontWeight:800,display:'flex',gap:6,alignItems:'center'}}><CheckCircle2 size={15}/> Cấu hình Round hợp lệ để preview.</div>}
      </div>
    </div>

    <div style={{marginTop:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:8}}><div><b>Cấu hình từng Round</b><div style={{fontSize:11,color:'#8a9099'}}>Thay đổi bên dưới chỉ nằm trong policy đang chỉnh; chỉ áp dụng production khi bấm “Lưu & áp dụng” của trang Matching.</div></div><span style={{fontSize:11,fontWeight:900,color:'#d71920'}}>PREVIEW</span></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(190px,1fr))',gap:9,overflowX:'auto'}}>
        {rounds.map((r,i)=><div key={i} style={{border:'1px solid #eceef1',borderRadius:14,padding:11,background:i===roundIndex?'#fff9f9':'#fff'}}>
          <div style={{fontWeight:900,marginBottom:8}}>Round {i+1}</div>
          <label style={{fontSize:11,fontWeight:800,color:'#69707a'}}>Bán kính (km)<input disabled={!canManage} type="number" min="0.5" step="0.5" value={r.radiusKm} onChange={e=>updateRound(i,'radiusKm',Number(e.target.value))} style={{width:'100%',boxSizing:'border-box',marginTop:4,padding:8,border:'1px solid #dde1e6',borderRadius:9}}/></label>
          <label style={{display:'block',fontSize:11,fontWeight:800,color:'#69707a',marginTop:7}}>Ứng viên tối đa<input disabled={!canManage} type="number" min="1" step="1" value={r.maxCandidates} onChange={e=>updateRound(i,'maxCandidates',Number(e.target.value))} style={{width:'100%',boxSizing:'border-box',marginTop:4,padding:8,border:'1px solid #dde1e6',borderRadius:9}}/></label>
          <label style={{display:'block',fontSize:11,fontWeight:800,color:'#69707a',marginTop:7}}>Timeout (giây)<input disabled={!canManage} type="number" min="3" step="1" value={r.offerTimeoutSeconds} onChange={e=>updateRound(i,'offerTimeoutSeconds',Number(e.target.value))} style={{width:'100%',boxSizing:'border-box',marginTop:4,padding:8,border:'1px solid #dde1e6',borderRadius:9}}/></label>
        </div>)}
      </div>
    </div>
  </Box>;
}
