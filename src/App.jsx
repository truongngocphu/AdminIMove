import React from 'react';
import PrivacyPolicyPage from './PrivacyPolicyPage.jsx';
import DriverManagement from './DriverManagement.jsx';
import AdminAccess from './AdminAccess.jsx';
import ProfilePage from './ProfilePage.jsx';
import AuditLogPage from './AuditLogPage.jsx';
import CoreOperationsPage from './CoreOperationsPage.jsx';
import MatchingControlPage from './MatchingControlPage.jsx';
import DispatchCenterPage from './DispatchCenterPage.jsx';
import TrustSafetyPage from './TrustSafetyPage.jsx';
import BroadcastCenterPage from './BroadcastCenterPage.jsx';
import SupportCenterPage from './SupportCenterPage.jsx';
import DriverExperiencePage from './DriverExperiencePage.jsx';
import DriverPointTopupsPage from './DriverPointTopupsPage.jsx';
import ProductionHealthPage from './ProductionHealthPage.jsx';
import TripOperationsMap from './TripOperationsMap.jsx';
import AnalyticsReportsPage from './ReportsPage.jsx';
import PaymentsV14Page from './PaymentsPage.jsx';
import ServicePricingPage from './ServicePricingPage.jsx';
import PromotionsAdminPage from './PromotionsAdminPage.jsx';
import DashboardPage from './DashboardPage.jsx';
import TripsPage from './TripsPage.jsx';
import CustomersPage from './CustomersPage.jsx';
import SettlementPage from './SettlementPage.jsx';
import MerchantsPage from './MerchantsPage.jsx';
import CommerceOrdersPage from './CommerceOrdersPage.jsx';
import EnterpriseSettingsPage from './SettingsPage.jsx';
import { PermissionDenied } from './AdminPageState.jsx';
import { adminApiRequest, adminAccessToken, hasPermission } from './adminApi.js';
import { coreAdminLogin, coreAdminLogout, hasCoreAdminSession, currentCoreAdmin } from './coreApi.js';
import { coreUrl, fetchWithTimeout } from './apiRuntime.js';
import {
  Bell, Search, Menu, X, LayoutDashboard, Users, Car, Route,
  WalletCards, ChartNoAxesCombined, Settings, LogOut, ArrowUpRight,
  CircleDollarSign, Clock3, ShieldCheck, CheckCircle2, MoreHorizontal,
  ChevronRight, Download, Database, RefreshCw, SlidersHorizontal,
  CalendarDays, Star, MapPin, TrendingUp, UserRoundCheck, BadgeDollarSign,
  FileText, Eye, Pencil, Trash2, Plus, ChevronDown, UsersRound, History, Activity, RadioTower, Fingerprint, Megaphone,
  PanelLeftClose, PanelLeftOpen, Store, ShoppingBag, Headphones
} from 'lucide-react';

const defaultSettings={companyName:'Công ty TNHH Đầu tư T&H 79',brandName:'TH79 iMove',hotline:'0335555066',autoAssign:true};
const dbCache={customers:[],drivers:[],trips:[],payments:[],revenue:[],settings:{...defaultSettings}};

async function apiRequest(path,options={}){
  const token=adminAccessToken();
  const headers={
    'Content-Type':'application/json',
    ...(token?{Authorization:`Bearer ${token}`}:{ }),
    ...(options.headers||{})
  };
  if(options.body instanceof FormData) delete headers['Content-Type'];
  let response;
  try{
    response=await fetchWithTimeout(coreUrl(`/api${path}`),{
      ...options,
      headers,
      cache:'no-store'
    },Number(options.timeoutMs||15000));
  }catch(error){
    if(error?.name==='AbortError') throw new Error('Backend phản hồi quá thời gian.');
    throw new Error(`Không kết nối được Backend: ${error?.message||String(error)}`);
  }
  const payload=await response.json().catch(()=>({}));
  if(response.status===401) window.dispatchEvent(new Event('imove:admin-auth-expired'));
  if(!response.ok) throw new Error(payload?.message||`API lỗi ${response.status}`);
  return payload;
}

async function syncFromServer(){
  const data=await apiRequest('/bootstrap');
  dbCache.customers=Array.isArray(data.customers)?data.customers:[];
  dbCache.drivers=Array.isArray(data.drivers)?data.drivers:[];
  dbCache.trips=Array.isArray(data.trips)?data.trips:[];
  dbCache.payments=Array.isArray(data.payments)?data.payments:[];
  dbCache.revenue=Array.isArray(data.revenue)?data.revenue:[];
  dbCache.settings=data.settings&&typeof data.settings==='object'?{...defaultSettings,...data.settings}:{...defaultSettings};
  window.dispatchEvent(new Event('imove:update'));
  return data;
}

async function syncDriversFromServer(){
  const drivers=await apiRequest('/data/drivers');
  dbCache.drivers=Array.isArray(drivers)?drivers:[];
  window.dispatchEvent(new Event('imove:update'));
  return dbCache.drivers;
}

function read(k){
  if(k==='settings') return {...dbCache.settings};
  return Array.isArray(dbCache[k])?[...dbCache[k]]:dbCache[k];
}

function write(k,v){
  dbCache[k]=k==='settings'?{...v}:[...v];
  window.dispatchEvent(new Event('imove:update'));
  apiRequest(`/data/${k}`,{method:'PUT',body:JSON.stringify(v)}).catch(async error=>{
    console.error('MongoDB save error:',error);
    window.alert(`Không thể lưu dữ liệu lên MongoDB: ${error.message}`);
    try{await syncFromServer()}catch(_){/* giữ giao diện hiện tại nếu API mất kết nối */}
  });
}

const money=v=>new Intl.NumberFormat('vi-VN').format(v||0)+' ₫';
function mongoNumber(value,fallback=0){
  if(value===null||value===undefined||value==='') return fallback;
  if(typeof value==='number') return Number.isFinite(value)?value:fallback;
  if(typeof value==='object'){
    if('$numberDecimal' in value) return Number(value.$numberDecimal)||fallback;
    if('$numberLong' in value) return Number(value.$numberLong)||fallback;
    if('$numberInt' in value) return Number(value.$numberInt)||fallback;
  }
  const n=Number(value);
  return Number.isFinite(n)?n:fallback;
}
function safeText(value,fallback='—'){
  if(value===null||value===undefined||value==='') return fallback;
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean') return String(value);
  if(typeof value==='object'){
    if(value.address) return String(value.address);
    if(value.addressText) return String(value.addressText);
    if(value.name) return String(value.name);
    if(value.code) return String(value.code);
    if(value.$oid) return String(value.$oid);
    if(value.toString && value.toString!==Object.prototype.toString){
      const s=String(value.toString());
      if(s && s!=='[object Object]') return s;
    }
  }
  return fallback;
}
function mongoId(value){
  if(value===null||value===undefined) return '';
  if(typeof value==='string') return value;
  if(typeof value==='object'&&value.$oid) return String(value.$oid);
  return safeText(value,'');
}
function bookingStatusToUi(status){
  const s=String(status||'').toUpperCase();
  if(['DRAFT','SEARCHING'].includes(s)) return 'waiting';
  if(s==='DRIVER_ASSIGNED') return 'confirmed';
  if(['DRIVER_ARRIVING','DRIVER_ARRIVED'].includes(s)) return 'arriving';
  if(s==='IN_PROGRESS') return 'running';
  if(s==='COMPLETED') return 'completed';
  if(['CANCELLED','CANCELLED_BY_USER','CANCELLED_BY_DRIVER','EXPIRED'].includes(s)) return 'cancelled';
  return String(status||'waiting').toLowerCase();
}
function uiStatusToBooking(status){
  return ({waiting:'SEARCHING',confirmed:'DRIVER_ASSIGNED',arriving:'DRIVER_ARRIVING',running:'IN_PROGRESS',completed:'COMPLETED',cancelled:'CANCELLED'})[status]||'SEARCHING';
}
function userStatusToUi(status){
  const s=String(status||'').toUpperCase();
  return s==='ACTIVE'?'active':'locked';
}
function uiStatusToUser(status){
  return status==='active'?'ACTIVE':'BLOCKED';
}

// Online là trạng thái vận hành do ứng dụng tài xế/Core Backend cập nhật.
// Admin chỉ đọc trạng thái này, không được tự bật/tắt.
function driverIsOnline(row){
  const status=String(row?.onlineStatus||'').trim().toUpperCase();
  if(status==='ONLINE'||status==='BUSY') return true;
  if(status==='OFFLINE') return false;
  // Tương thích dữ liệu demo/phiên bản cũ nếu chưa có onlineStatus.
  return row?.online===true;
}
function DriverOnlineIndicator({row}){
  const online=driverIsOnline(row);
  const rawStatus=String(row?.onlineStatus||'').trim().toUpperCase();
  const label=online?(rawStatus==='BUSY'?'Đang hoạt động':'Online'):'Offline';
  return <span title="Trạng thái được cập nhật tự động từ ứng dụng tài xế" aria-label={`Tài xế ${label}`} style={{display:'inline-flex',alignItems:'center',gap:7,fontWeight:700,whiteSpace:'nowrap',color:online?'#15803d':'#b42318'}}>
    <span aria-hidden="true" style={{width:10,height:10,borderRadius:'50%',background:online?'#22c55e':'#ef4444',boxShadow:`0 0 0 4px ${online?'rgba(34,197,94,.13)':'rgba(239,68,68,.11)'}`,flex:'0 0 auto'}}></span>
    <span>{label}</span>
  </span>;
}
function hasRole(user,role){
  return !Array.isArray(user?.roles) || user.roles.includes(role);
}
function tripPriceValue(row){
  if(row?.price!==undefined&&row?.price!==null) return mongoNumber(row.price);
  const p=row?.pricing||{};
  for(const key of ['total','finalTotal','finalFare','totalFare','grandTotal','payableAmount','amount']){
    if(p?.[key]!==undefined&&p?.[key]!==null) return mongoNumber(p[key]);
  }
  return 0;
}
function paymentLabel(value){
  const s=String(value||'').toUpperCase();
  return ({CASH:'Tiền mặt',BANK_TRANSFER:'Chuyển khoản',MOMO:'MoMo',VNPAY:'VNPay',WALLET:'Ví iMove'})[s]||safeText(value,'—');
}
function dateLabel(value){
  if(!value) return '—';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?safeText(value,'—'):new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
}
function xmlEscape(value){
  return String(value??'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function excelColumnName(index){
  let name='';
  for(let n=index+1;n>0;n=Math.floor((n-1)/26)) name=String.fromCharCode(65+(n-1)%26)+name;
  return name;
}
const crcTable=(()=>{
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
    table[n]=c>>>0;
  }
  return table;
})();
function crc32(bytes){
  let crc=0xFFFFFFFF;
  for(const byte of bytes) crc=(crc>>>8)^crcTable[(crc^byte)&0xFF];
  return (crc^0xFFFFFFFF)>>>0;
}
function writeU16(view,offset,value){view.setUint16(offset,value,true)}
function writeU32(view,offset,value){view.setUint32(offset,value>>>0,true)}
function zipStored(entries){
  const encoder=new TextEncoder();
  const localParts=[];
  const centralParts=[];
  let offset=0;
  for(const entry of entries){
    const nameBytes=encoder.encode(entry.name);
    const dataBytes=typeof entry.data==='string'?encoder.encode(entry.data):entry.data;
    const checksum=crc32(dataBytes);
    const local=new Uint8Array(30+nameBytes.length);
    const lv=new DataView(local.buffer);
    writeU32(lv,0,0x04034b50);writeU16(lv,4,20);writeU16(lv,6,0x0800);writeU16(lv,8,0);
    writeU16(lv,10,0);writeU16(lv,12,0);writeU32(lv,14,checksum);writeU32(lv,18,dataBytes.length);
    writeU32(lv,22,dataBytes.length);writeU16(lv,26,nameBytes.length);writeU16(lv,28,0);local.set(nameBytes,30);
    localParts.push(local,dataBytes);

    const central=new Uint8Array(46+nameBytes.length);
    const cv=new DataView(central.buffer);
    writeU32(cv,0,0x02014b50);writeU16(cv,4,20);writeU16(cv,6,20);writeU16(cv,8,0x0800);writeU16(cv,10,0);
    writeU16(cv,12,0);writeU16(cv,14,0);writeU32(cv,16,checksum);writeU32(cv,20,dataBytes.length);writeU32(cv,24,dataBytes.length);
    writeU16(cv,28,nameBytes.length);writeU16(cv,30,0);writeU16(cv,32,0);writeU16(cv,34,0);writeU16(cv,36,0);
    writeU32(cv,38,0);writeU32(cv,42,offset);central.set(nameBytes,46);centralParts.push(central);
    offset+=local.length+dataBytes.length;
  }
  const centralSize=centralParts.reduce((sum,part)=>sum+part.length,0);
  const eocd=new Uint8Array(22);
  const ev=new DataView(eocd.buffer);
  writeU32(ev,0,0x06054b50);writeU16(ev,4,0);writeU16(ev,6,0);writeU16(ev,8,entries.length);writeU16(ev,10,entries.length);
  writeU32(ev,12,centralSize);writeU32(ev,16,offset);writeU16(ev,20,0);
  return new Blob([...localParts,...centralParts,eocd],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function exportExcel(filename,sheetName,headers,rows){
  const safeSheet=(sheetName||'Dữ liệu').replace(/[\\/?*\[\]:]/g,' ').slice(0,31)||'Dữ liệu';
  const all=[headers,...rows];
  const maxCols=Math.max(1,headers.length);
  const maxRows=Math.max(1,all.length);
  const widths=headers.map((_,col)=>{
    const maxLen=Math.max(...all.map(row=>String(row[col]??'').length));
    return Math.min(42,Math.max(10,maxLen+2));
  });
  const cols=widths.map((width,i)=>`<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`).join('');
  const rowXml=all.map((row,rowIndex)=>{
    const cells=headers.map((_,colIndex)=>{
      const value=row[colIndex]??'';
      const ref=`${excelColumnName(colIndex)}${rowIndex+1}`;
      const style=rowIndex===0?' s="1"':'';
      if(rowIndex>0 && typeof value==='number' && Number.isFinite(value)) return `<c r="${ref}"${style}><v>${value}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex+1}">${cells}</row>`;
  }).join('');
  const range=`A1:${excelColumnName(maxCols-1)}${maxRows}`;
  const worksheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${range}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${cols}</cols>
  <sheetData>${rowXml}</sheetData>
  <autoFilter ref="${range}"/>
</worksheet>`;
  const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${xmlEscape(safeSheet)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD71920"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
  const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbookRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const blob=zipStored([
    {name:'[Content_Types].xml',data:contentTypes},
    {name:'_rels/.rels',data:rootRels},
    {name:'xl/workbook.xml',data:workbook},
    {name:'xl/_rels/workbook.xml.rels',data:workbookRels},
    {name:'xl/styles.xml',data:styles},
    {name:'xl/worksheets/sheet1.xml',data:worksheet}
  ]);
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=filename.endsWith('.xlsx')?filename:`${filename}.xlsx`;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const labels={active:'Đang hoạt động',locked:'Đã khóa',approved:'Đã duyệt',pending:'Chờ duyệt',running:'Đang chạy',arriving:'Đang đến',waiting:'Chờ tài xế',completed:'Hoàn thành',confirmed:'Đã xác nhận',cancelled:'Đã hủy',success:'Thành công',failed:'Thất bại'};

function Status({value}){return <span className={'status status-'+value}>{labels[value]||value}</span>}
function IconButton({label,children,onClick,className=''}){return <button type="button" className={'icon-button '+className} aria-label={label} title={label} onClick={onClick}>{children}</button>}
const pageIntroIcons={
  'Chuyến xe':Route,
  'Thanh toán':WalletCards,
  'Khách hàng':Users,
  'Tài xế':Car,
  'Giá cước':BadgeDollarSign,
  'Báo cáo':ChartNoAxesCombined,
  'Cài đặt':Settings,
};
function PageIntro({title,description,actions}){
  const IntroIcon=pageIntroIcons[title];
  return <header className="page-intro"><div className="page-intro-main">{IntroIcon&&<span className="page-intro-icon"><IntroIcon size={21}/></span>}<div><h1>{title}</h1><p>{description}</p></div></div>{actions&&<div className="page-actions">{actions}</div>}</header>
}
function CardHeading({title,sub,action}){return <header className="card-heading"><div><h2>{title}</h2>{sub&&<p>{sub}</p>}</div>{action}</header>}
function SearchField({value,onChange,placeholder='Tìm kiếm...'}){return <label className="search-field"><span className="sr-only">Tìm kiếm</span><Search size={17} aria-hidden="true"/><input type="search" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}
function TableShell({caption,children}){return <div className="table-scroll"><table><caption className="sr-only">{caption}</caption>{children}</table></div>}
function MiniPerson({name,sub,avatar}){const initial=name?.trim()?.split(' ').slice(-1)[0]?.[0]||'?';return <div className="person"><span className="person-avatar" aria-hidden="true">{avatar?<img src={avatar} alt=""/>:initial}</span><span><b>{name||'Chưa cập nhật tên'}</b><small>{sub}</small></span></div>}

function ExportFieldModal({open,onClose,title,filename,sheetName,columns,rows}){
  const [selected,setSelected]=React.useState([]);
  React.useEffect(()=>{if(open)setSelected(columns.map(c=>c.key))},[open,columns]);
  if(!open)return null;
  const allSelected=selected.length===columns.length;
  const toggle=(key)=>setSelected(list=>list.includes(key)?list.filter(x=>x!==key):[...list,key]);
  const exportNow=()=>{
    if(!selected.length){window.alert('Vui lòng chọn ít nhất 1 mục cần xuất.');return}
    const chosen=columns.filter(c=>selected.includes(c.key));
    const headers=chosen.map(c=>c.label);
    const data=rows.map(row=>chosen.map(c=>c.get?c.get(row):(row?.[c.key]??'')));
    exportExcel(filename,sheetName,headers,data);onClose();
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="modal export-modal" role="dialog" aria-modal="true" aria-labelledby="export-modal-title" onMouseDown={e=>e.stopPropagation()}>
      <header><div><h2 id="export-modal-title">{title}</h2><p>Chọn các cột cần đưa vào file Excel.</p></div><IconButton label="Đóng" onClick={onClose}><X size={18}/></IconButton></header>
      <div className="export-toolbar"><span>Đã chọn <b>{selected.length}/{columns.length}</b> mục</span><button type="button" className="text-button export-select-all" onClick={()=>setSelected(allSelected?[]:columns.map(c=>c.key))}>{allSelected?'Bỏ chọn tất cả':'Chọn tất cả'}</button></div>
      <div className="export-fields" role="group" aria-label="Các cột xuất Excel">{columns.map(c=><label className="export-field" key={c.key}><input type="checkbox" checked={selected.includes(c.key)} onChange={()=>toggle(c.key)}/><span><b>{c.label}</b>{c.description&&<small>{c.description}</small>}</span></label>)}</div>
      <footer><button type="button" className="button" onClick={onClose}>Hủy</button><button type="button" className="button button-primary" onClick={exportNow}><Download size={16}/> Xuất {rows.length} dòng</button></footer>
    </section>
  </div>
}

function Login({onLogin}){
  const [login,setLogin]=React.useState('0909000099');
  const [password,setPassword]=React.useState('');
  const [error,setError]=React.useState('');
  const [loading,setLoading]=React.useState(false);

  async function submit(e){
    e.preventDefault();
    if(!login.trim()||!password){
      setError('Vui lòng nhập tài khoản và mật khẩu.');
      return;
    }
    setError('');
    setLoading(true);
    try{
      await coreAdminLogin({login:login.trim(),password});
      onLogin();
    }catch(err){
      setError(err.message||'Không thể đăng nhập quản trị.');
    }finally{
      setLoading(false);
    }
  }

  return <main className="login-layout login-v151" id="main-content">
    <section className="login-showcase" aria-labelledby="login-showcase-title">
      <div className="brand-chip">TH79 iMOVE · HỆ THỐNG NỘI BỘ</div>
      <div className="login-copy">
        <p className="eyebrow">TH79 iMove Admin Center</p>
        <h1 id="login-showcase-title">Quản trị vận hành và xác minh tài xế.</h1>
        <p>Quản lý chuyến xe, người dùng, tài xế, KYC, giá cước và tài chính trong cùng hệ thống.</p>
      </div>
    </section>
    <section className="login-panel" aria-labelledby="login-title">
      <div className="login-card">
        <div className="brand-logo"><span>iM</span><div><b>TH79 iMove</b><small>ADMIN CENTER</small></div></div>
        <h2 id="login-title">Đăng nhập quản trị</h2>
        <p>Xác thực bằng tài khoản ADMIN trên Core Backend.</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="admin-login">Số điện thoại hoặc Email</label>
          <input id="admin-login" autoComplete="username" value={login} onChange={e=>setLogin(e.target.value)} placeholder="SĐT hoặc email Admin"/>
          <label htmlFor="admin-password">Mật khẩu</label>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nhập mật khẩu"/>
          {error&&<p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-wide" type="submit" disabled={loading}>
            {loading?'Đang xác thực...':'Đăng nhập'}
          </button>
        </form>
      </div>
    </section>
  </main>
}

const nav=[
  ['overview','Tổng quan',LayoutDashboard,'dashboard.view'],
  ['operations','Bản đồ vận hành',MapPin,'bookings.view'],
  ['trips','Chuyến xe',Route,'bookings.view'],
  ['dispatch69','Live Dispatch',RadioTower,'matching.view'],
  ['matching','Matching & Phát đơn',SlidersHorizontal,'matching.view'],
  ['driver-experience','Driver Experience',Star,'drivers.view'],
  ['customers','Khách hàng',Users,'users.view'],
  ['drivers','Tài xế',Car,'drivers.view'],
  ['merchants','Nhà hàng & Cửa hàng',Store,'merchants.view'],
  ['commerce-orders','Đơn giao/đồ ăn/mua hộ',ShoppingBag,'orders.view'],
  ['kyc','Hồ sơ / KYC tài xế',UserRoundCheck,'drivers.review'],
  ['pricing','Dịch vụ & Giá cước',BadgeDollarSign,'pricing.view'],
  ['promotions','Khuyến mãi',CircleDollarSign,'promotions.view'],
  ['payments','Thanh toán',WalletCards,'payments.view'],
  ['driver-point-topups','Điểm & nạp quỹ',BadgeDollarSign,'drivers.view'],
  ['settlement','Settlement / Đối soát',CircleDollarSign,'settlements.view'],
  ['reports','Báo cáo',ChartNoAxesCombined,'reports.view'],
  ['support','Chat Support',Headphones,'support.view'],
  ['broadcasts','Thông báo hệ thống',Megaphone,'broadcast.view'],
  ['trust','Trust & Safety',Fingerprint,'trust.view'],
  ['production-health','Security Test Mode',Activity,'settings.view'],
  ['admin-accounts','Tài khoản nội bộ',UsersRound,'admins.view'],
  ['admin-roles','Phân quyền',ShieldCheck,'roles.manage'],
  ['admin-audit','Lịch sử thao tác',History,'audit.view'],
  ['admin-profile','Thông tin cá nhân',UserRoundCheck,null],
  ['settings','Cài đặt hệ thống',Settings,'settings.view']
];

const navGroups=[
  {label:'TỔNG QUAN',items:['overview']},
  {label:'VẬN HÀNH',items:['operations','trips','dispatch69','matching','driver-experience']},
  {label:'NGƯỜI DÙNG & ĐỐI TÁC',items:['customers','drivers','kyc','merchants']},
  {label:'COMMERCE',items:['commerce-orders']},
  {label:'KINH DOANH',items:['pricing','promotions','payments','driver-point-topups','settlement','reports']},
  {label:'CHĂM SÓC & TRUYỀN THÔNG',items:['support','broadcasts']},
  {label:'AN TOÀN & HỆ THỐNG',items:['trust','production-health','admin-accounts','admin-roles','admin-audit','admin-profile','settings']}
];

const specialPageTitles={
  'admin-profile':'Thông tin cá nhân',
  'admin-accounts':'Quản lý tài khoản',
  'admin-roles':'Phân quyền',
  'admin-audit':'Lịch sử thao tác'
};

function Shell({page,setPage,onLogout,access,children}){
  const [menuOpen,setMenuOpen]=React.useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=React.useState(()=>localStorage.getItem('imove_sidebar_collapsed')==='1');
  const [activePopover,setActivePopover]=React.useState(null);
  const [searchQuery,setSearchQuery]=React.useState('');
  const [dataTick,setDataTick]=React.useState(0);
  const [notificationsRead,setNotificationsRead]=React.useState(()=>localStorage.getItem('imove_notifications_read')==='1');
  const popoverRef=React.useRef(null);
  const searchInputRef=React.useRef(null);

  React.useEffect(()=>{
    const sync=()=>setDataTick(v=>v+1);
    window.addEventListener('imove:update',sync);
    return()=>window.removeEventListener('imove:update',sync);
  },[]);

  React.useEffect(()=>{
    if(activePopover==='search') setTimeout(()=>searchInputRef.current?.focus(),0);
  },[activePopover]);

  React.useEffect(()=>{
    function closeOnOutside(e){
      if(activePopover && popoverRef.current && !popoverRef.current.contains(e.target)) setActivePopover(null);
    }
    function closeOnEscape(e){if(e.key==='Escape') setActivePopover(null)}
    document.addEventListener('mousedown',closeOnOutside);
    document.addEventListener('keydown',closeOnEscape);
    return()=>{document.removeEventListener('mousedown',closeOnOutside);document.removeEventListener('keydown',closeOnEscape)};
  },[activePopover]);

  const normalizeText=(value='')=>value
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim();

  const searchResults=React.useMemo(()=>{
    if(!searchQuery.trim()) return [];
    const q=normalizeText(searchQuery);
    const people=[
      ...read('customers').filter(item=>hasRole(item,'CUSTOMER')).map(item=>({...item,name:item.fullName||item.name||'',role:'Khách hàng',target:'customers'})),
      ...read('drivers').map(item=>({...item,role:'Tài xế',target:'drivers'}))
    ];
    return people
      .filter(item=>normalizeText(`${item.name||''} ${item.phone||''} ${item.id||item._id||''}`).includes(q))
      .slice(0,8);
  },[searchQuery,dataTick]);

  const notifications=React.useMemo(()=>{
    const pendingDriver=read('drivers').find(d=>d.approval==='pending');
    const waitingTrip=read('trips').find(t=>t.status==='waiting');
    const pendingPayment=read('payments').find(p=>p.status==='pending');
    return [
      pendingDriver && {id:'driver',title:'Hồ sơ tài xế chờ duyệt',description:`${pendingDriver.name} đang chờ phê duyệt hồ sơ.`,target:'drivers'},
      waitingTrip && {id:'trip',title:'Chuyến đang chờ tài xế',description:`${waitingTrip.id} · ${waitingTrip.customer} chưa được gán tài xế.`,target:'trips'},
      pendingPayment && {id:'payment',title:'Giao dịch cần đối soát',description:`${pendingPayment.id} · ${money(pendingPayment.amount)} đang chờ xác nhận.`,target:'payments'}
    ].filter(Boolean);
  },[dataTick]);

  const unreadCount=notificationsRead?0:notifications.length;
  const openPage=(target)=>{setPage(target);setActivePopover(null);setSearchQuery('');setMenuOpen(false)};
  const markAllRead=()=>{localStorage.setItem('imove_notifications_read','1');setNotificationsRead(true)};
  const can=(permission)=>!access||hasPermission(access,permission);
  const profile=access?.user||currentCoreAdmin()||{};
  const profileName=profile.fullName||'Quản trị viên';
  const profileRole=access?.roleNames?.join(', ')||'Quản trị viên';
  const profileInitials=profileName.trim().split(/\s+/).filter(Boolean).slice(-2).map(x=>x[0]).join('').toUpperCase()||'AD';
  const activeNavItem=nav.find(([id])=>id===page);
  const currentPageTitle=specialPageTitles[page]||activeNavItem?.[1]||'Quản trị hệ thống';
  const currentDate=new Intl.DateTimeFormat('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());
  const toggleSidebar=()=>setSidebarCollapsed(value=>{
    const next=!value;
    localStorage.setItem('imove_sidebar_collapsed',next?'1':'0');
    return next;
  });

  return <div className={`app-shell app-frame sidebar-shell ${sidebarCollapsed?'sidebar-collapsed':''} ${menuOpen?'sidebar-mobile-open':''}`}>
    <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>

    <aside className="sidebar" aria-label="Thanh điều hướng quản trị">
      <div className="sidebar-head">
        <button type="button" className="sidebar-brand" onClick={()=>setPage('overview')} aria-label="Về trang tổng quan TH79 iMove">
          <span className="brand-mark">iM</span>
          <span className="sidebar-brand-copy"><b>TH79 iMove</b><small>ADMIN SYSTEM</small></span>
        </button>
        <button type="button" className="sidebar-collapse" onClick={toggleSidebar} aria-label={sidebarCollapsed?'Mở rộng sidebar':'Thu gọn sidebar'} title={sidebarCollapsed?'Mở rộng sidebar':'Thu gọn sidebar'}>
          {sidebarCollapsed?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>} 
        </button>
      </div>

      <nav id="main-navigation" className="sidebar-nav" aria-label="Điều hướng quản trị chính">
        {navGroups.map(group=>{
          const items=group.items.map(id=>nav.find(([navId])=>navId===id)).filter(Boolean).filter(([, , ,permission])=>can(permission));
          if(!items.length)return null;
          return <section className="sidebar-group" key={group.label}>
            <div className="sidebar-group-label">{group.label}</div>
            <div className="sidebar-group-items">
              {items.map(([id,label,Icon])=><button key={id} type="button" className={page===id?'active':''} aria-current={page===id?'page':undefined} title={sidebarCollapsed?label:undefined} onClick={()=>{setPage(id);setMenuOpen(false)}}>
                <span className="sidebar-item-icon"><Icon size={19}/></span><span className="sidebar-item-label">{label}</span>
                {page===id&&<span className="sidebar-active-dot" aria-hidden="true"/>}
              </button>)}
            </div>
          </section>;
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-system-state" title="Hệ thống đang kết nối MongoDB Atlas và Node.js API">
          <span className="system-live-dot"/><span className="sidebar-system-copy"><b>Hệ thống hoạt động</b><small>MongoDB Atlas · Node.js API</small></span>
        </div>
      </div>
    </aside>

    <button type="button" className="sidebar-overlay" aria-label="Đóng menu" onClick={()=>setMenuOpen(false)}></button>

    <section className="app-workspace">
      <header className="topbar site-header">
        <div className="header-primary">
          <button className="mobile-menu" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X size={20}/>:<Menu size={20}/>}<span className="sr-only">Mở menu</span></button>

          <div className="topbar-context">
            <nav className="topbar-breadcrumb" aria-label="Đường dẫn trang"><span>TH79 iMove</span><ChevronRight size={14}/><strong>{currentPageTitle}</strong></nav>
          </div>

          <div className="header-actions" ref={popoverRef}>
            <button type="button" className={`topbar-search-trigger ${activePopover==='search'?'active':''}`} aria-label="Tìm kiếm khách hàng hoặc tài xế" onClick={()=>setActivePopover(activePopover==='search'?null:'search')}><Search size={17}/><span>Tìm kiếm...</span></button>
            <IconButton label="Thông báo" className={(activePopover==='notifications'?'active ':'')+'has-badge'} onClick={()=>setActivePopover(activePopover==='notifications'?null:'notifications')}><Bell size={18}/>{unreadCount>0&&<span className="notification-dot" aria-label={`${unreadCount} thông báo mới`}>{unreadCount}</span>}</IconButton>

            {activePopover==='search'&&<section className="header-popover search-popover" aria-label="Tìm kiếm nhanh">
              <header className="popover-header"><div><h2>Tìm kiếm nhanh</h2><p>Khách hàng và tài xế</p></div></header>
              <label className="global-search-input" htmlFor="header-global-search"><Search size={17} aria-hidden="true"/><span className="sr-only">Nhập tên khách hàng hoặc tài xế</span><input ref={searchInputRef} id="header-global-search" type="search" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Nhập tên, SĐT hoặc mã..." autoComplete="off"/></label>
              <div className="search-result-list" role="listbox" aria-label="Kết quả tìm kiếm">
                {!searchQuery.trim()&&<p className="popover-empty">Nhập ít nhất 1 chữ cái để tìm theo tên.</p>}
                {searchQuery.trim()&&searchResults.length===0&&<p className="popover-empty">Không tìm thấy khách hàng hoặc tài xế phù hợp.</p>}
                {searchResults.map(item=><button key={`${item.target}-${item.id}`} type="button" className="search-result" onClick={()=>openPage(item.target)}>
                  <span className={'search-avatar '+(item.target==='drivers'?'driver':'customer')}>{item.name?.trim()?.split(' ').slice(-1)[0]?.[0]||'?'}</span>
                  <span className="search-result-main"><b>{item.name} <em>— {item.role}</em></b><small>{item.id} · {item.phone}</small></span>
                  <ChevronRight size={16} aria-hidden="true"/>
                </button>)}
              </div>
              {searchQuery.trim()&&searchResults.length>0&&<footer className="popover-footer"><span>{searchResults.length} kết quả đang hiển thị</span></footer>}
            </section>}

            {activePopover==='notifications'&&<section className="header-popover notification-popover" aria-label="Thông báo hệ thống">
              <header className="popover-header notification-head"><div><h2>Thông báo</h2><p>{unreadCount>0?`${unreadCount} thông báo chưa đọc`:'Không có thông báo chưa đọc'}</p></div>{notifications.length>0&&<button type="button" className="text-action" onClick={markAllRead}>Đánh dấu đã đọc</button>}</header>
              <div className="notification-list">
                {notifications.length===0&&<p className="popover-empty">Hiện chưa có thông báo vận hành.</p>}
                {notifications.map((item,index)=><button key={item.id} type="button" className={'notification-item '+(!notificationsRead?'unread':'')} onClick={()=>{markAllRead();openPage(item.target)}}>
                  <span className="notification-icon">{index+1}</span>
                  <span><b>{item.title}</b><small>{item.description}</small></span>
                  <ChevronRight size={15} aria-hidden="true"/>
                </button>)}
              </div>
            </section>}

            <button type="button" className={activePopover==='account'?'profile-button active':'profile-button'} aria-label="Mở menu tài khoản quản trị" aria-expanded={activePopover==='account'} onClick={()=>setActivePopover(activePopover==='account'?null:'account')}>
              <span className="profile-avatar">{profileInitials}</span><span className="profile-copy"><b>{profileName}</b><small>{profileRole}</small></span><ChevronDown size={15} className="profile-chevron"/>
            </button>
            {activePopover==='account'&&<section className="header-popover account-popover" aria-label="Tài khoản quản trị">
              <div className="account-popover-head"><span className="profile-avatar large">{profileInitials}</span><div><b>{profileName}</b><small>{profile.email||profile.phone||'Tài khoản nội bộ'}</small><em>{profileRole}</em></div></div>
              <div className="account-menu-list">
                <button type="button" onClick={()=>openPage('admin-profile')}><UserRoundCheck size={17}/><span><b>Thông tin cá nhân</b><small>Cập nhật hồ sơ và thay đổi mật khẩu</small></span><ChevronRight size={15}/></button>
                {can('admins.view')&&<button type="button" onClick={()=>openPage('admin-accounts')}><UsersRound size={17}/><span><b>Quản lý tài khoản</b><small>Tạo, sửa, khóa và quản lý tài khoản nội bộ</small></span><ChevronRight size={15}/></button>}
                {can('roles.manage')&&<button type="button" onClick={()=>openPage('admin-roles')}><ShieldCheck size={17}/><span><b>Phân quyền</b><small>Quản lý vai trò và quyền truy cập</small></span><ChevronRight size={15}/></button>}
                {can('audit.view')&&<button type="button" onClick={()=>openPage('admin-audit')}><History size={17}/><span><b>Lịch sử thao tác</b><small>Theo dõi thay đổi của các tài khoản nội bộ</small></span><ChevronRight size={15}/></button>}
              </div>
              <div className="account-menu-divider"></div>
              <button type="button" className="account-logout" onClick={onLogout}><LogOut size={17}/><span><b>Đăng xuất</b><small>Kết thúc phiên quản trị hiện tại</small></span></button>
            </section>}
          </div>
        </div>
      </header>

      <main id="main-content" className="content-area main-content">{children}</main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} TH79 iMove Admin Center</span><span>TrackAsia Full Enterprise · v1.5.1</span></footer>
    </section>
  </div>
}

function Dashboard({setPage}){
  const [version,setVersion]=React.useState(0);React.useEffect(()=>{const f=()=>setVersion(v=>v+1);window.addEventListener('imove:update',f);return()=>window.removeEventListener('imove:update',f)},[]);
  const customers=read('customers').filter(x=>hasRole(x,'CUSTOMER')),drivers=read('drivers'),trips=read('trips'),payments=read('payments');
  const online=drivers.filter(driverIsOnline).length; const waiting=trips.filter(x=>['waiting','arriving','running','confirmed'].includes(x.status));
  const paid=payments.filter(x=>x.status==='success').reduce((s,x)=>s+Number(x.amount||0),0); const revenue=read('revenue'); const max=Math.max(1,...revenue.map(x=>Number(x.value)||0));
  const serviceCounts=trips.reduce((a,t)=>(a[t.service]=(a[t.service]||0)+1,a),{}); const totalServices=Math.max(1,Object.values(serviceCounts).reduce((a,b)=>a+b,0));
  return <>
    <PageIntro title="Chào buổi chiều, Quản trị viên" description="Đây là những gì đang diễn ra trong hệ thống TH79 iMove hôm nay." actions={<span className="date-chip"><CalendarDays size={16}/> {new Intl.DateTimeFormat('vi-VN').format(new Date())}</span>}/>
    <section aria-labelledby="overview-heading"><h2 id="overview-heading" className="sr-only">Chỉ số tổng quan</h2>
      <div className="metric-grid">
        <article className="metric-card"><div className="metric-top"><span>Chuyến hôm nay</span><Route size={17}/></div><strong>{trips.length}</strong><p>{waiting.length} chuyến đang xử lý</p><div className="spark"><i style={{height:'38%'}}/><i style={{height:'50%'}}/><i style={{height:'44%'}}/><i style={{height:'67%'}}/><i style={{height:'74%'}}/><i style={{height:'92%'}}/></div></article>
        <article className="metric-card"><div className="metric-top"><span>Doanh thu</span><CircleDollarSign size={17}/></div><strong>{money(paid)}</strong><p>Thanh toán đã xác nhận</p><div className="spark"><i style={{height:'31%'}}/><i style={{height:'46%'}}/><i style={{height:'42%'}}/><i style={{height:'62%'}}/><i style={{height:'77%'}}/><i style={{height:'96%'}}/></div></article>
        <article className="metric-card"><div className="metric-top"><span>Tài xế online</span><Car size={17}/></div><strong>{online}</strong><p>{drivers.length} tài xế trong MongoDB</p><div className="spark dark"><i style={{height:'52%'}}/><i style={{height:'58%'}}/><i style={{height:'48%'}}/><i style={{height:'64%'}}/><i style={{height:'69%'}}/><i style={{height:'81%'}}/></div></article>
        <article className="metric-card"><div className="metric-top"><span>Khách hàng</span><Users size={17}/></div><strong>{customers.length}</strong><p>Dữ liệu khách hàng hiện có</p><div className="spark dark"><i style={{height:'33%'}}/><i style={{height:'41%'}}/><i style={{height:'48%'}}/><i style={{height:'57%'}}/><i style={{height:'61%'}}/><i style={{height:'73%'}}/></div></article>
      </div>
    </section>

    <section className="dashboard-layout" aria-label="Tổng hợp vận hành">
      <article className="card recent-card"><CardHeading title="Chuyến gần đây" sub="Các chuyến mới nhất cần theo dõi" action={<button className="text-button" onClick={()=>setPage('trips')}>Xem tất cả <ChevronRight size={14}/></button>}/>
        <div className="activity-list">{trips.slice(0,5).map(t=><button className="activity-row" key={t.id} onClick={()=>setPage('trips')}><span className={'activity-icon trip-'+t.status}><Route size={16}/></span><span className="activity-main"><b>{t.id} · {t.customer}</b><small>{t.service} · {t.driver}</small></span><span className="activity-side"><Status value={t.status}/><small>{t.time}</small></span></button>)}</div>
      </article>

      <article className="card workflow-card"><CardHeading title="Luồng vận hành" sub="Các hạng mục đang cần xử lý"/>
        <div className="workflow-list">
          <button type="button" onClick={()=>setPage('trips')}><span className="workflow-icon red"><Route size={16}/></span><span><b>{waiting.length} chuyến đang hoạt động</b><small>Điều phối và giám sát trạng thái</small></span><ChevronRight size={15}/></button>
          <button type="button" onClick={()=>setPage('drivers')}><span className="workflow-icon amber"><UserRoundCheck size={16}/></span><span><b>{drivers.filter(x=>x.approval==='pending').length} hồ sơ tài xế chờ duyệt</b><small>Kiểm tra giấy phép và hồ sơ</small></span><ChevronRight size={15}/></button>
          <button type="button" onClick={()=>setPage('payments')}><span className="workflow-icon blue"><BadgeDollarSign size={16}/></span><span><b>{payments.filter(x=>x.status==='pending').length} giao dịch chờ đối soát</b><small>Xác nhận trước cuối ngày</small></span><ChevronRight size={15}/></button>
          <button type="button" onClick={()=>setPage('reports')}><span className="workflow-icon green"><CheckCircle2 size={16}/></span><span><b>94,6% chuyến hoàn thành</b><small>Mục tiêu vận hành ≥ 95%</small></span><ArrowUpRight size={15}/></button>
        </div>
      </article>

      <article className="card storage-card"><CardHeading title="Cơ cấu dịch vụ" sub="Phân bổ theo dữ liệu chuyến MongoDB"/>
        <div className="donut-wrap"><div className="donut" style={{'--p':'72%'}}><span><b>{trips.length}</b><small>chuyến mẫu</small></span></div></div>
        <div className="legend-list">{Object.entries(serviceCounts).map(([name,count],i)=><div key={name}><span className={'legend-dot d'+i}></span><b>{name}</b><small>{Math.round(count/totalServices*100)}%</small></div>)}</div>
      </article>

      <article className="card revenue-card"><CardHeading title="Xu hướng doanh thu" sub="7 ngày gần nhất" action={<span className="positive-chip"><TrendingUp size={14}/> +14,2%</span>}/>
        <div className="bar-chart" role="img" aria-label="Biểu đồ cột doanh thu 7 ngày">{revenue.length===0?<p className="empty-state">Chưa có dữ liệu doanh thu trong collection revenue.</p>:revenue.map((r,i)=><div key={r.day} className="bar-col"><div className={i===6?'bar active':'bar'} style={{height:`${Math.max(18,r.value/max*100)}%`}}><span>{i===6?money(r.value):''}</span></div><small>{r.day}</small></div>)}</div>
      </article>

      <article className="card payment-card"><CardHeading title="Thanh toán gần đây" sub="Tình trạng đối soát giao dịch" action={<button className="text-button" onClick={()=>setPage('payments')}>Xem tất cả <ChevronRight size={14}/></button>}/>
        <div className="file-list compact-payment-list">{payments.slice(0,4).map(p=><div key={p.id}><span className="file-icon"><WalletCards size={16}/></span><span><b>{p.id}</b><small>{paymentLabel(p.method)} · {money(p.amount)}</small></span><Status value={p.status}/></div>)}</div>
        <div className="payment-total"><span>Đã ghi nhận trong MongoDB</span><b>{money(paid)}</b></div>
      </article>
    </section>
  </>
}

function Customers(){
  const rawUsers=read('customers');
  const rawTrips=read('trips');
  const buildRows=React.useCallback(()=>rawUsers.filter(u=>hasRole(u,'CUSTOMER')).map(u=>{
    const uid=mongoId(u._id||u.id);
    const customerTrips=rawTrips.filter(t=>mongoId(t.customerId)===uid);
    const completedTrips=customerTrips.filter(t=>String(t.status||'').toUpperCase()==='COMPLETED');
    return {
      ...u,
      id:uid,
      name:u.fullName||u.name||'',
      phone:u.phone||'',
      email:u.email||'',
      avatarUrl:u.avatarUrl||'',
      status:userStatusToUi(u.status),
      trips:customerTrips.length,
      spend:completedTrips.reduce((sum,t)=>sum+tripPriceValue(t),0),
      joined:u.createdAt?String(u.createdAt).slice(0,10):''
    };
  }),[rawUsers,rawTrips]);
  const [rows,setRows]=React.useState(buildRows);
  const [q,setQ]=React.useState(''); const [editing,setEditing]=React.useState(null); const [showForm,setShowForm]=React.useState(false); const [showExport,setShowExport]=React.useState(false);
  const [form,setForm]=React.useState(null); const [saving,setSaving]=React.useState(false);
  const filtered=rows.filter(r=>`${r.id||''} ${r.name||''} ${r.phone||''} ${r.email||''}`.toLowerCase().includes(q.toLowerCase()));
  async function save(e){
    e.preventDefault();
    if(!editing||!form) return;
    try{
      setSaving(true);
      const updated=await apiRequest(`/users/${editing}`,{method:'PATCH',body:JSON.stringify({fullName:form.name,phone:form.phone,email:form.email||null,status:uiStatusToUser(form.status)})});
      setRows(list=>list.map(r=>r.id===editing?{...r,...form,name:updated.fullName||form.name,phone:updated.phone||form.phone,email:updated.email||'',avatarUrl:updated.avatarUrl||r.avatarUrl,status:userStatusToUi(updated.status)}:r));
      setShowForm(false);setEditing(null);setForm(null);
      await syncFromServer();
    }catch(error){window.alert(`Không thể lưu khách hàng: ${error.message}`)}finally{setSaving(false)}
  }
  function edit(r){setEditing(r.id);setForm({...r});setShowForm(true)}
  async function remove(id){
    if(!window.confirm('Xóa khách hàng này khỏi MongoDB?')) return;
    try{await apiRequest(`/users/${id}`,{method:'DELETE'});setRows(list=>list.filter(r=>r.id!==id));await syncFromServer()}
    catch(error){window.alert(`Không thể xóa khách hàng: ${error.message}`)}
  }
  const exportColumns=[
    {key:'id',label:'Mã khách hàng'},{key:'name',label:'Họ và tên'},{key:'phone',label:'Số điện thoại'},{key:'email',label:'Email'},
    {key:'trips',label:'Số chuyến'},{key:'spend',label:'Tổng chi tiêu'},{key:'joined',label:'Ngày tham gia'},
    {key:'status',label:'Trạng thái',get:r=>labels[r.status]||r.status}
  ];
  return <>
    <PageIntro title="Khách hàng" description="Dữ liệu tài khoản CUSTOMER đọc trực tiếp từ collection users trong MongoDB." actions={<button type="button" className="button" onClick={()=>setShowExport(true)}><Download size={16}/> Xuất Excel</button>}/>
    <section className="card data-card" aria-labelledby="customer-list-title"><CardHeading title="Danh sách khách hàng" sub={`${filtered.length} tài khoản CUSTOMER đang hiển thị`} action={<SearchField value={q} onChange={setQ} placeholder="Tên, SĐT, email..."/>}/>
      <TableShell caption="Danh sách khách hàng TH79 iMove"><thead><tr><th scope="col">Khách hàng</th><th scope="col">Điện thoại</th><th scope="col">Số chuyến</th><th scope="col">Chi tiêu</th><th scope="col">Ngày tham gia</th><th scope="col">Trạng thái</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><MiniPerson name={r.name} avatar={r.avatarUrl} sub={`${r.id} · ${r.email||'Chưa có email'}`}/></td><td>{r.phone||'—'}</td><td>{r.trips}</td><td><b>{money(r.spend)}</b></td><td>{r.joined||'—'}</td><td><Status value={r.status}/></td><td><div className="row-actions"><IconButton label={`Sửa ${r.name||'khách hàng'}`} onClick={()=>edit(r)}><Pencil size={15}/></IconButton><IconButton label={`Xóa ${r.name||'khách hàng'}`} onClick={()=>remove(r.id)}><Trash2 size={15}/></IconButton></div></td></tr>)}</tbody></TableShell>
    </section>
    {showForm&&form&&<div className="modal-backdrop" role="presentation" onMouseDown={()=>!saving&&setShowForm(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="customer-form-title" onMouseDown={e=>e.stopPropagation()}><header><h2 id="customer-form-title">Sửa khách hàng</h2><IconButton label="Đóng" onClick={()=>!saving&&setShowForm(false)}><X size={18}/></IconButton></header><form onSubmit={save}><div className="form-grid"><label>Họ và tên<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Số điện thoại<input required inputMode="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label className="span-2">Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Trạng thái<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="active">Đang hoạt động</option><option value="locked">Đã khóa</option></select></label><label>Ngày tham gia<input type="date" value={form.joined||''} disabled/></label></div><footer><button type="button" className="button" disabled={saving} onClick={()=>setShowForm(false)}>Hủy</button><button className="button button-primary" disabled={saving}>{saving?'Đang lưu...':'Lưu thay đổi'}</button></footer></form></section></div>}
    <ExportFieldModal open={showExport} onClose={()=>setShowExport(false)} title="Xuất danh sách khách hàng" filename="TH79_iMove_Danh_sach_khach_hang.xlsx" sheetName="Danh sách khách hàng" columns={exportColumns} rows={filtered}/>
  </>
}

function Drivers(){
  const users=read('customers');
  const userById=new Map(users.map(u=>[mongoId(u._id||u.id),u]));
  const [rows,setRows]=React.useState(read('drivers'));const [q,setQ]=React.useState('');const [showExport,setShowExport]=React.useState(false);

  // Nhận dữ liệu mới mỗi khi bootstrap được đồng bộ lại từ MongoDB.
  React.useEffect(()=>{
    const refreshRows=()=>setRows(read('drivers'));
    window.addEventListener('imove:update',refreshRows);
    return()=>window.removeEventListener('imove:update',refreshRows);
  },[]);

  // Collection `drivers` lưu userId, còn họ tên/SĐT nằm trong collection `users`.
  const linkedUser=r=>userById.get(mongoId(r?.userId))||r?.user||null;
  const driverName=r=>linkedUser(r)?.fullName||linkedUser(r)?.name||r?.fullName||r?.name||'';
  const driverPhone=r=>linkedUser(r)?.phone||r?.phone||'';
  const driverEmail=r=>linkedUser(r)?.email||r?.email||'';

  const filtered=rows.filter(r=>`${r.id||''} ${driverName(r)} ${driverPhone(r)} ${driverEmail(r)} ${r.service||''} ${r.area||''}`.toLowerCase().includes(q.toLowerCase()));
  function commit(next){setRows(next);write('drivers',next)}
  const exportColumns=[
    {key:'id',label:'Mã tài xế'},{key:'name',label:'Họ tên',get:r=>driverName(r)},{key:'phone',label:'Số điện thoại',get:r=>driverPhone(r)},{key:'service',label:'Dịch vụ'},
    {key:'area',label:'Khu vực'},{key:'license',label:'GPLX'},{key:'rating',label:'Đánh giá',get:r=>r.rating||''},{key:'trips',label:'Số chuyến'},
    {key:'income',label:'Thu nhập'},{key:'approval',label:'Hồ sơ',get:r=>labels[r.approval]||r.approval},{key:'online',label:'Online',get:r=>driverIsOnline(r)?'Online':'Offline'}
  ];
  return <><PageIntro title="Tài xế" description="Theo dõi tài xế và trạng thái hoạt động. Online được cập nhật tự động từ ứng dụng tài xế; Admin không thể bật/tắt thủ công." actions={<button type="button" className="button" onClick={()=>setShowExport(true)}><Download size={16}/> Xuất Excel</button>}/>
    <section className="summary-strip" aria-label="Tổng hợp tài xế"><div><Car size={17}/><span><b>{rows.length}</b><small>Tổng tài xế</small></span></div><div><span className="live-dot"></span><span><b>{rows.filter(driverIsOnline).length}</b><small>Đang online</small></span></div><div><Clock3 size={17}/><span><b>{rows.filter(x=>x.approval==='pending').length}</b><small>Chờ duyệt</small></span></div><div><Star size={17}/><span><b>4.8</b><small>Đánh giá TB</small></span></div></section>
    <section className="card data-card"><CardHeading title="Danh sách tài xế" sub="Chấm xanh = đang hoạt động · chấm đỏ = không hoạt động" action={<SearchField value={q} onChange={setQ} placeholder="Tên, khu vực, dịch vụ..."/>}/><TableShell caption="Danh sách tài xế TH79 iMove"><thead><tr><th scope="col">Tài xế</th><th scope="col">Dịch vụ</th><th scope="col">Khu vực</th><th scope="col">GPLX</th><th scope="col">Đánh giá</th><th scope="col">Chuyến</th><th scope="col">Thu nhập</th><th scope="col">Hồ sơ</th><th scope="col">Online</th></tr></thead><tbody>{filtered.map(r=>{const name=driverName(r);const phone=driverPhone(r);return <tr key={r.id}><td><MiniPerson name={name} sub={`${r.id} · ${phone||'—'}`}/></td><td>{r.service}</td><td>{r.area}</td><td>{r.license}</td><td><span className="rating"><Star size={14}/>{r.rating||'Mới'}</span></td><td>{r.trips}</td><td>{money(r.income)}</td><td>{r.approval==='pending'?<button className="button button-success button-small" onClick={()=>commit(rows.map(x=>x.id===r.id?{...x,approval:'approved'}:x))}><CheckCircle2 size={14}/> Duyệt</button>:<Status value="approved"/>}</td><td><DriverOnlineIndicator row={r}/></td></tr>})}</tbody></TableShell></section>
    <ExportFieldModal open={showExport} onClose={()=>setShowExport(false)} title="Xuất danh sách tài xế" filename="TH79_iMove_Danh_sach_tai_xe.xlsx" sheetName="Danh sách tài xế" columns={exportColumns} rows={filtered}/>
  </>
}

function Trips(){
  const rawTrips=read('trips');
  const users=read('customers');
  const driverDocs=read('drivers');
  const [q,setQ]=React.useState('');
  const [filter,setFilter]=React.useState('all');
  const [showExport,setShowExport]=React.useState(false);
  const [savingId,setSavingId]=React.useState('');

  const userById=new Map(users.map(u=>[mongoId(u._id||u.id),u]));
  const driverNameById=new Map(driverDocs.map(d=>{
    const user=userById.get(mongoId(d.userId));
    return [mongoId(d._id||d.id),user?.fullName||user?.name||d.name||'Tài xế'];
  }));

  const rows=rawTrips.map(r=>({
    ...r,
    _mongoId:mongoId(r._id||r.id),
    id:safeText(r.bookingCode||r.id||r._id,'—'),
    customer:r.customer||userById.get(mongoId(r.customerId))?.fullName||userById.get(mongoId(r.customerId))?.name||safeText(r.customerId,'Chưa xác định'),
    driver:r.driver||driverNameById.get(mongoId(r.driverId))||(r.driverId?'Tài xế':'Chưa gán'),
    service:r.service||r.serviceCode||'—',
    _pickupRaw:r.pickup,
    _destinationRaw:r.destination,
    pickup:safeText(r.pickup,'Chưa có địa chỉ'),
    destination:safeText(r.destination,'Chưa có địa chỉ'),
    price:tripPriceValue(r),
    payment:r.payment||paymentLabel(r.paymentMethod),
    status:bookingStatusToUi(r.status),
    time:r.time||dateLabel(r.createdAt||r.requestedAt)
  }));

  const filtered=rows.filter(r=>`${r.id||''} ${r.customer||''} ${r.driver||''} ${r.service||''} ${r.pickup||''} ${r.destination||''}`.toLowerCase().includes(q.toLowerCase())&&(filter==='all'||r.status===filter));

  async function changeStatus(row,nextStatus){
    if(!row._mongoId) return window.alert('Không xác định được ID MongoDB của chuyến.');
    try{
      setSavingId(row._mongoId);
      await apiRequest(`/bookings/${encodeURIComponent(row._mongoId)}/status`,{method:'PATCH',body:JSON.stringify({status:uiStatusToBooking(nextStatus)})});
      await syncFromServer();
    }catch(error){
      window.alert(`Không thể cập nhật trạng thái chuyến: ${error.message}`);
    }finally{setSavingId('')}
  }

  const exportColumns=[
    {key:'id',label:'Mã chuyến'},{key:'customer',label:'Khách hàng'},{key:'driver',label:'Tài xế'},{key:'service',label:'Dịch vụ'},
    {key:'pickup',label:'Điểm đón'},{key:'destination',label:'Điểm đến'},{key:'price',label:'Giá'},{key:'payment',label:'Thanh toán'},
    {key:'status',label:'Trạng thái',get:r=>labels[r.status]||r.status},{key:'time',label:'Thời gian'}
  ];

  return <><PageIntro title="Chuyến xe" description="Theo dõi dữ liệu booking trực tiếp từ MongoDB." actions={<button type="button" className="button" onClick={()=>setShowExport(true)}><Download size={16}/> Xuất Excel</button>}/>
    <TripOperationsMap trips={rows}/>
    <section className="card data-card"><CardHeading title="Danh sách chuyến" sub={`${filtered.length} chuyến đang hiển thị`} action={<div className="filter-tools"><SearchField value={q} onChange={setQ} placeholder="Mã chuyến, khách, tài xế..."/><label className="select-control"><span className="sr-only">Lọc trạng thái</span><SlidersHorizontal size={15}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả</option><option value="waiting">Chờ tài xế</option><option value="confirmed">Đã xác nhận</option><option value="arriving">Đang đến</option><option value="running">Đang chạy</option><option value="completed">Hoàn thành</option><option value="cancelled">Đã hủy</option></select></label></div>}/><TableShell caption="Danh sách chuyến xe TH79 iMove"><thead><tr><th scope="col">Mã chuyến</th><th scope="col">Khách hàng</th><th scope="col">Tài xế</th><th scope="col">Dịch vụ</th><th scope="col">Hành trình</th><th scope="col">Giá</th><th scope="col">Thanh toán</th><th scope="col">Trạng thái</th><th scope="col" className="table-action-col">Thao tác</th></tr></thead><tbody>{filtered.map(r=><tr key={r._mongoId||r.id}><td><span className="table-primary">{r.id}</span><small className="table-sub">{r.time}</small></td><td>{r.customer}</td><td>{r.driver}</td><td>{r.service}</td><td><span className="route-line"><i></i>{r.pickup}</span><span className="route-line muted"><i></i>{r.destination}</span></td><td><span className="table-primary">{money(r.price)}</span></td><td>{r.payment}</td><td><label><span className="sr-only">Trạng thái {r.id}</span><select disabled={savingId===r._mongoId} className={'status-select status-'+r.status} value={r.status} onChange={e=>changeStatus(r,e.target.value)}><option value="waiting">Chờ tài xế</option><option value="confirmed">Đã xác nhận</option><option value="arriving">Đang đến</option><option value="running">Đang chạy</option><option value="completed">Hoàn thành</option><option value="cancelled">Đã hủy</option></select></label></td><td className="table-action-cell"><button type="button" className="table-action-button" title={`Tùy chọn chuyến ${r.id}`}><MoreHorizontal size={17}/></button></td></tr>)}</tbody></TableShell></section>
    <ExportFieldModal open={showExport} onClose={()=>setShowExport(false)} title="Xuất danh sách chuyến xe" filename="TH79_iMove_Danh_sach_chuyen_xe.xlsx" sheetName="Danh sách chuyến xe" columns={exportColumns} rows={filtered}/>
  </>
}


function PricingPage(){
  const [data,setData]=React.useState({services:[],areas:[],fares:[],fees:[],surcharges:[]});
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState('');
  const [serviceCode,setServiceCode]=React.useState('');
  const [areaCode,setAreaCode]=React.useState('');
  const [selectedFareId,setSelectedFareId]=React.useState('');
  const [fareForm,setFareForm]=React.useState(null);
  const [feeForm,setFeeForm]=React.useState(null);
  const [saving,setSaving]=React.useState(false);
  const [saved,setSaved]=React.useState('');
  const [showExport,setShowExport]=React.useState(false);
  const [showCreateFare,setShowCreateFare]=React.useState(false);
  const [showCreateFee,setShowCreateFee]=React.useState(false);
  const [surchargeEditor,setSurchargeEditor]=React.useState(null);
  const [newFare,setNewFare]=React.useState({serviceCode:'',serviceName:'',areaCode:'',areaName:'',status:'DRAFT',baseFare:'',baseDistanceKm:'',minimumFare:'',pricePerMinute:'',roundingUnit:'',note:''});
  const [newFee,setNewFee]=React.useState({serviceCode:'',areaCode:'',status:'DRAFT',bookingFee:'',customerServiceFee:'',driverFixedFee:'',paymentFeePercent:'',commissionType:'PERCENT',commissionValue:''});
  const [calc,setCalc]=React.useState({distanceKm:'',durationMinutes:'',surchargeCodes:[]});
  const [estimate,setEstimate]=React.useState(null);
  const [calcLoading,setCalcLoading]=React.useState(false);

  const getServiceName=(code)=>(data.services||[]).find(x=>x.code===code)?.name||'';
  const getAreaName=(code)=>(data.areas||[]).find(x=>x.code===code)?.name||'';
  const normalizeCode=v=>String(v||'').trim().toUpperCase();

  const serviceOptions=React.useMemo(()=>{
    const map=new Map();
    for(const s of (data.services||[])) if(s.code) map.set(s.code,{code:s.code,name:s.name||s.code,status:s.status});
    for(const row of [...(data.fares||[]),...(data.fees||[]),...(data.surcharges||[])]) if(row.serviceCode&&!map.has(row.serviceCode)) map.set(row.serviceCode,{code:row.serviceCode,name:row.serviceCode,status:'ACTIVE'});
    return [...map.values()].sort((a,b)=>String(a.code).localeCompare(String(b.code)));
  },[data.services,data.fares,data.fees,data.surcharges]);
  const areaOptions=React.useMemo(()=>{
    const map=new Map();
    for(const a of (data.areas||[])) if(a.code) map.set(a.code,{code:a.code,name:a.name||a.code,status:a.status});
    for(const row of [...(data.fares||[]),...(data.fees||[])]) if(row.areaCode&&!map.has(row.areaCode)) map.set(row.areaCode,{code:row.areaCode,name:row.areaCode,status:'ACTIVE'});
    return [...map.values()].sort((a,b)=>String(a.code).localeCompare(String(b.code)));
  },[data.areas,data.fares,data.fees]);

  const load=React.useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const payload=await apiRequest('/pricing/bootstrap');
      setData(payload);
      const serviceCodes=[...(payload.services||[]).map(x=>x.code),...(payload.fares||[]).map(x=>x.serviceCode)].filter(Boolean);
      const areaCodes=[...(payload.areas||[]).map(x=>x.code),...(payload.fares||[]).map(x=>x.areaCode)].filter(Boolean);
      setServiceCode(prev=>prev||serviceCodes[0]||'');
      setAreaCode(prev=>prev||areaCodes[0]||'');
    }catch(e){setError(e.message||'Không tải được dữ liệu giá cước')}finally{setLoading(false)}
  },[]);
  React.useEffect(()=>{load()},[load]);

  const activeFare=React.useMemo(()=>{
    if(!serviceCode)return null;
    const fares=(data.fares||[]).filter(x=>x.serviceCode===serviceCode&&x.status==='ACTIVE');
    return fares.find(x=>x.areaCode===areaCode)||fares.find(x=>x.areaCode==='GLOBAL')||null;
  },[data.fares,serviceCode,areaCode]);
  const selectedFare=React.useMemo(()=>{
    if(selectedFareId)return (data.fares||[]).find(x=>x.id===selectedFareId)||activeFare;
    return activeFare;
  },[data.fares,selectedFareId,activeFare]);
  const activeFee=React.useMemo(()=>{
    if(!serviceCode)return null;
    const fees=(data.fees||[]).filter(x=>x.serviceCode===serviceCode&&x.status==='ACTIVE');
    return fees.find(x=>x.areaCode===areaCode)||fees.find(x=>x.areaCode==='GLOBAL')||null;
  },[data.fees,serviceCode,areaCode]);
  const relatedSurcharges=React.useMemo(()=>(data.surcharges||[]).filter(x=>!serviceCode||x.serviceCode===serviceCode),[data.surcharges,serviceCode]);

  React.useEffect(()=>{
    setFareForm(selectedFare?{...selectedFare,distanceTiers:(selectedFare.distanceTiers||[]).map(t=>({...t}))}:null);
    setEstimate(null);
  },[selectedFare?.id,serviceCode,areaCode]);
  React.useEffect(()=>{
    setFeeForm(activeFee?{...activeFee,driverCommission:activeFee.driverCommission?{...activeFee.driverCommission}:{type:'PERCENT',value:''}}:null);
  },[activeFee?.id,serviceCode,areaCode]);

  function validateFarePayload(form){
    const required=[['serviceCode','Mã dịch vụ'],['areaCode','Mã khu vực'],['baseFare','Giá mở cửa'],['baseDistanceKm','Km cơ bản'],['minimumFare','Giá tối thiểu'],['pricePerMinute','Giá/phút'],['roundingUnit','Đơn vị làm tròn']];
    for(const [key,label] of required) if(String(form?.[key]??'').trim()==='') throw new Error(`Vui lòng nhập ${label}.`);
    if(Number(form.roundingUnit)<=0) throw new Error('Đơn vị làm tròn phải lớn hơn 0.');
  }
  function farePayload(form,includeScope=false){
    validateFarePayload(form);
    const payload={
      status:form.status||'DRAFT',baseFare:Number(form.baseFare),baseDistanceKm:Number(form.baseDistanceKm),minimumFare:Number(form.minimumFare),
      pricePerMinute:Number(form.pricePerMinute),roundingUnit:Number(form.roundingUnit),note:form.note?.trim()||null,
      distanceTiers:(form.distanceTiers||[]).map((t,i)=>{
        if(String(t.fromKm??'').trim()===''||String(t.pricePerKm??'').trim()==='') throw new Error(`Mốc km ${i+1}: cần nhập Từ km và Giá/km.`);
        return {fromKm:Number(t.fromKm),toKm:String(t.toKm??'').trim()===''?null:Number(t.toKm),pricePerKm:Number(t.pricePerKm)};
      })
    };
    if(includeScope){payload.serviceCode=normalizeCode(form.serviceCode);payload.serviceName=String(form.serviceName||'').trim();payload.areaCode=normalizeCode(form.areaCode);payload.areaName=String(form.areaName||'').trim();}
    return payload;
  }

  async function createFare(e){
    e.preventDefault();setSaving(true);setSaved('');
    try{
      const created=await apiRequest('/pricing/fare',{method:'POST',body:JSON.stringify(farePayload({...newFare,distanceTiers:[]},true))});
      setShowCreateFare(false);setSelectedFareId(created.id);setServiceCode(created.serviceCode);setAreaCode(created.areaCode);
      setNewFare({serviceCode:'',serviceName:'',areaCode:'',areaName:'',status:'DRAFT',baseFare:'',baseDistanceKm:'',minimumFare:'',pricePerMinute:'',roundingUnit:'',note:''});
      await load();setSaved('Đã tạo bảng giá mới và lưu vào MongoDB.');
    }catch(err){window.alert('Không thể tạo bảng giá: '+err.message)}finally{setSaving(false)}
  }
  async function saveFare(){
    if(!fareForm?.id)return;
    setSaving(true);setSaved('');
    try{
      const updated=await apiRequest(`/pricing/fare/${fareForm.id}`,{method:'PUT',body:JSON.stringify(farePayload(fareForm,false))});
      setData(d=>({...d,fares:d.fares.map(x=>x.id===updated.id?updated:x)}));setFareForm(updated);setSaved('Đã lưu bảng giá vào MongoDB.');
    }catch(e){window.alert('Không thể lưu bảng giá: '+e.message)}finally{setSaving(false)}
  }
  async function deleteFare(item){
    if(!window.confirm(`Xóa bảng giá ${item.serviceCode} / ${item.areaCode} phiên bản ${item.version}?\nThao tác này sẽ xóa document khỏi MongoDB.`))return;
    try{await apiRequest(`/pricing/fare/${item.id}`,{method:'DELETE'});if(selectedFareId===item.id)setSelectedFareId('');await load();setSaved('Đã xóa bảng giá khỏi MongoDB.')}catch(e){window.alert('Không thể xóa bảng giá: '+e.message)}
  }
  function editFare(item){setServiceCode(item.serviceCode);setAreaCode(item.areaCode);setSelectedFareId(item.id);window.scrollTo({top:0,behavior:'smooth'})}

  function validateFee(form){
    if(!normalizeCode(form.serviceCode))throw new Error('Vui lòng nhập mã dịch vụ.');
    if(!normalizeCode(form.areaCode))throw new Error('Vui lòng nhập mã khu vực.');
    if(String(form.commissionValue??form.driverCommission?.value??'').trim()==='')throw new Error('Vui lòng nhập hoa hồng tài xế.');
  }
  async function createFee(e){
    e.preventDefault();setSaving(true);setSaved('');
    try{
      validateFee(newFee);
      await apiRequest('/pricing/platform-fee',{method:'POST',body:JSON.stringify({
        serviceCode:normalizeCode(newFee.serviceCode),areaCode:normalizeCode(newFee.areaCode),status:newFee.status||'DRAFT',
        bookingFee:String(newFee.bookingFee).trim()===''?null:Number(newFee.bookingFee),customerServiceFee:String(newFee.customerServiceFee).trim()===''?null:Number(newFee.customerServiceFee),
        driverFixedFee:String(newFee.driverFixedFee).trim()===''?null:Number(newFee.driverFixedFee),paymentFeePercent:String(newFee.paymentFeePercent).trim()===''?null:Number(newFee.paymentFeePercent),
        driverCommission:{type:newFee.commissionType||'PERCENT',value:Number(newFee.commissionValue)}
      })});
      setShowCreateFee(false);setNewFee({serviceCode:'',areaCode:'',status:'DRAFT',bookingFee:'',customerServiceFee:'',driverFixedFee:'',paymentFeePercent:'',commissionType:'PERCENT',commissionValue:''});await load();setSaved('Đã tạo cấu hình phí nền tảng trong MongoDB.');
    }catch(err){window.alert('Không thể tạo phí nền tảng: '+err.message)}finally{setSaving(false)}
  }
  async function saveFee(){
    if(!feeForm?.id)return;
    setSaving(true);setSaved('');
    try{
      const updated=await apiRequest(`/pricing/platform-fee/${feeForm.id}`,{method:'PUT',body:JSON.stringify({
        status:feeForm.status||'DRAFT',bookingFee:String(feeForm.bookingFee??'').trim()===''?null:Number(feeForm.bookingFee),
        customerServiceFee:String(feeForm.customerServiceFee??'').trim()===''?null:Number(feeForm.customerServiceFee),driverFixedFee:String(feeForm.driverFixedFee??'').trim()===''?null:Number(feeForm.driverFixedFee),
        paymentFeePercent:String(feeForm.paymentFeePercent??'').trim()===''?null:Number(feeForm.paymentFeePercent),driverCommission:{type:feeForm.driverCommission?.type||'PERCENT',value:Number(feeForm.driverCommission?.value)}
      })});
      setData(d=>({...d,fees:d.fees.map(x=>x.id===updated.id?updated:x)}));setFeeForm(updated);setSaved('Đã lưu phí nền tảng vào MongoDB.');
    }catch(e){window.alert('Không thể lưu phí nền tảng: '+e.message)}finally{setSaving(false)}
  }
  async function deleteFee(item){
    if(!window.confirm(`Xóa cấu hình phí ${item.serviceCode} / ${item.areaCode}?`))return;
    try{await apiRequest(`/pricing/platform-fee/${item.id}`,{method:'DELETE'});await load();setSaved('Đã xóa cấu hình phí nền tảng.')}catch(e){window.alert('Không thể xóa phí nền tảng: '+e.message)}
  }

  function openNewSurcharge(){setSurchargeEditor({id:'',code:'',name:'',serviceCode:serviceCode||'',areaCodes:areaCode?[areaCode]:[],calculationType:'FIXED',value:'',status:'INACTIVE'})}
  async function saveSurchargeEditor(e){
    e.preventDefault();const item=surchargeEditor;if(!item)return;
    if(!normalizeCode(item.code)||!String(item.name||'').trim()||!normalizeCode(item.serviceCode)||String(item.value??'').trim()===''){window.alert('Vui lòng nhập mã, tên, dịch vụ và giá trị phụ phí.');return}
    const payload={code:normalizeCode(item.code),name:String(item.name).trim(),serviceCode:normalizeCode(item.serviceCode),areaCodes:Array.isArray(item.areaCodes)?item.areaCodes.map(normalizeCode).filter(Boolean):[],calculationType:item.calculationType||'FIXED',value:Number(item.value),status:item.status||'INACTIVE'};
    try{
      if(item.id) await apiRequest(`/pricing/surcharge/${item.id}`,{method:'PATCH',body:JSON.stringify(payload)});
      else await apiRequest('/pricing/surcharge',{method:'POST',body:JSON.stringify(payload)});
      setSurchargeEditor(null);await load();setSaved(item.id?'Đã cập nhật phụ phí.':'Đã thêm phụ phí vào MongoDB.');
    }catch(e2){window.alert('Không thể lưu phụ phí: '+e2.message)}
  }
  async function updateSurcharge(item,patch){
    try{const updated=await apiRequest(`/pricing/surcharge/${item.id}`,{method:'PATCH',body:JSON.stringify(patch)});setData(d=>({...d,surcharges:d.surcharges.map(x=>x.id===updated.id?updated:x)}))}catch(e){window.alert('Không thể cập nhật phụ phí: '+e.message)}
  }
  async function deleteSurcharge(item){
    if(!window.confirm(`Xóa phụ phí ${item.name}?`))return;
    try{await apiRequest(`/pricing/surcharge/${item.id}`,{method:'DELETE'});await load();setSaved('Đã xóa phụ phí khỏi MongoDB.')}catch(e){window.alert('Không thể xóa phụ phí: '+e.message)}
  }

  function updateTier(index,key,value){setFareForm(f=>({...f,distanceTiers:f.distanceTiers.map((t,i)=>i===index?{...t,[key]:value}:t)}))}
  function addTier(){setFareForm(f=>({...f,distanceTiers:[...(f.distanceTiers||[]),{fromKm:'',toKm:'',pricePerKm:''}]}))}
  function removeTier(index){setFareForm(f=>({...f,distanceTiers:f.distanceTiers.filter((_,i)=>i!==index)}))}

  async function calculateFare(e){
    e?.preventDefault();
    if(!serviceCode){window.alert('Chưa có dịch vụ để tính giá.');return}
    if(String(calc.distanceKm).trim()===''||String(calc.durationMinutes).trim()===''){window.alert('Vui lòng nhập khoảng cách và thời gian.');return}
    setCalcLoading(true);setEstimate(null);
    try{setEstimate(await apiRequest('/fares/estimate',{method:'POST',body:JSON.stringify({serviceCode,areaCode:areaCode||'GLOBAL',distanceKm:Number(calc.distanceKm),durationMinutes:Number(calc.durationMinutes),surchargeCodes:calc.surchargeCodes})}))}
    catch(e2){window.alert('Không tính được giá: '+e2.message)}finally{setCalcLoading(false)}
  }

  const exportRows=fareForm?[{
    serviceCode:fareForm.serviceCode,areaCode:fareForm.areaCode,version:fareForm.version,status:fareForm.status,baseFare:fareForm.baseFare,baseDistanceKm:fareForm.baseDistanceKm,
    minimumFare:fareForm.minimumFare,pricePerMinute:fareForm.pricePerMinute,roundingUnit:fareForm.roundingUnit,
    bookingFee:feeForm?.bookingFee??'',customerServiceFee:feeForm?.customerServiceFee??'',commission:feeForm?.driverCommission?.value??'',
    tiers:(fareForm.distanceTiers||[]).map(t=>`${t.fromKm}-${t.toKm??'∞'} km: ${money(t.pricePerKm)}/km`).join(' | ')
  }]:[];
  const exportColumns=[
    {key:'serviceCode',label:'Dịch vụ'},{key:'areaCode',label:'Khu vực áp dụng'},{key:'version',label:'Phiên bản'},{key:'status',label:'Trạng thái'},
    {key:'baseFare',label:'Giá mở cửa'},{key:'baseDistanceKm',label:'Km cơ bản'},{key:'minimumFare',label:'Giá tối thiểu'},{key:'pricePerMinute',label:'Giá/phút'},
    {key:'roundingUnit',label:'Đơn vị làm tròn'},{key:'bookingFee',label:'Phí đặt xe'},{key:'customerServiceFee',label:'Phí dịch vụ KH'},
    {key:'commission',label:'Hoa hồng tài xế'},{key:'tiers',label:'Các mốc giá/km'}
  ];

  if(loading)return <section className="card pricing-loading"><RefreshCw className="spin" size={24}/><h1>Đang tải dữ liệu giá cước từ MongoDB...</h1></section>;
  if(error)return <><PageIntro title="Giá cước" description="Dữ liệu giá cước được đọc trực tiếp từ MongoDB."/><section className="card pricing-error"><p>{error}</p><button className="button button-primary" onClick={load}><RefreshCw size={16}/> Thử lại</button></section></>;

  return <>
    <PageIntro title="Giá cước" description="Không dùng giá mẫu. Toàn bộ bảng giá, phí và phụ phí trên trang này được đọc/ghi trực tiếp vào MongoDB." actions={<div className="page-action-row"><button type="button" className="button button-primary" onClick={()=>{setNewFare({serviceCode:serviceCode||'',serviceName:getServiceName(serviceCode),areaCode:areaCode||'',areaName:getAreaName(areaCode),status:'DRAFT',baseFare:'',baseDistanceKm:'',minimumFare:'',pricePerMinute:'',roundingUnit:'',note:''});setShowCreateFare(true)}}><Plus size={16}/> Tạo bảng giá</button><button type="button" className="button" onClick={()=>setShowExport(true)} disabled={!fareForm}><Download size={16}/> Xuất Excel</button><button type="button" className="button" onClick={load}><RefreshCw size={16}/> Tải lại MongoDB</button></div>}/>

    <section className="pricing-selector card" aria-labelledby="pricing-filter-title"><div><h2 id="pricing-filter-title">Phạm vi quản lý</h2><p>Dropdown chỉ hiển thị dữ liệu đang tồn tại trong MongoDB. Nếu trống, dùng nút Tạo bảng giá.</p></div><label>Dịch vụ<select value={serviceCode} onChange={e=>{setServiceCode(e.target.value);setSelectedFareId('')}}><option value="">Chưa chọn</option>{serviceOptions.map(s=><option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}</select></label><label>Khu vực<select value={areaCode} onChange={e=>{setAreaCode(e.target.value);setSelectedFareId('')}}><option value="">Chưa chọn</option>{areaOptions.map(a=><option key={a.code} value={a.code}>{a.name} ({a.code})</option>)}</select></label></section>

    <section className="card pricing-card pricing-database-list"><CardHeading title="Bảng giá trong MongoDB" sub={`${(data.fares||[]).length} document trong collection fare_configs`} action={<button type="button" className="button button-small button-primary" onClick={()=>setShowCreateFare(true)}><Plus size={15}/> Thêm mới</button>}/>{(data.fares||[]).length?<TableShell caption="Danh sách bảng giá MongoDB"><thead><tr><th scope="col">Dịch vụ</th><th scope="col">Khu vực</th><th scope="col">Phiên bản</th><th scope="col">Trạng thái</th><th scope="col">Giá mở cửa</th><th scope="col">Giá tối thiểu</th><th scope="col">Thao tác</th></tr></thead><tbody>{(data.fares||[]).map(item=><tr key={item.id}><td><b>{item.serviceCode}</b></td><td>{item.areaCode}</td><td>v{item.version}</td><td><span className={'pricing-status pricing-status-'+String(item.status).toLowerCase()}>{item.status}</span></td><td>{money(item.baseFare)}</td><td>{money(item.minimumFare)}</td><td><div className="row-actions"><IconButton label="Sửa bảng giá" onClick={()=>editFare(item)}><Pencil size={16}/></IconButton><IconButton label="Xóa bảng giá" className="danger" onClick={()=>deleteFare(item)}><Trash2 size={16}/></IconButton></div></td></tr>)}</tbody></TableShell>:<div className="pricing-empty-state"><Database size={32}/><h3>MongoDB chưa có bảng giá</h3><p>Không có giá mặc định trên web. Hãy tạo bảng giá đầu tiên, dữ liệu sẽ được lưu vào <code>fare_configs</code>.</p><button type="button" className="button button-primary" onClick={()=>setShowCreateFare(true)}><Plus size={16}/> Tạo bảng giá đầu tiên</button></div>}</section>

    {fareForm?<>
      {fareForm.areaCode!==areaCode&&areaCode&&<div className="pricing-notice" role="status"><BadgeDollarSign size={18}/><span>Khu vực <b>{areaCode}</b> chưa có bảng giá ACTIVE riêng. Máy tính giá sẽ fallback sang <b>{fareForm.areaCode}</b> nếu document này đang ACTIVE.</span></div>}
      <section className="pricing-layout">
        <article className="card pricing-card"><CardHeading title="Chỉnh sửa bảng giá" sub={`${fareForm.serviceCode} · ${fareForm.areaCode} · phiên bản ${fareForm.version}`}/><div className="pricing-form-grid">
          <label>Trạng thái<select value={fareForm.status||'DRAFT'} onChange={e=>setFareForm({...fareForm,status:e.target.value})}><option value="DRAFT">DRAFT</option><option value="ACTIVE">ACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select></label>
          <label>Giá mở cửa (đ)<input type="number" min="0" value={fareForm.baseFare??''} onChange={e=>setFareForm({...fareForm,baseFare:e.target.value})}/></label>
          <label>Km cơ bản<input type="number" min="0" step="0.1" value={fareForm.baseDistanceKm??''} onChange={e=>setFareForm({...fareForm,baseDistanceKm:e.target.value})}/></label>
          <label>Giá tối thiểu (đ)<input type="number" min="0" value={fareForm.minimumFare??''} onChange={e=>setFareForm({...fareForm,minimumFare:e.target.value})}/></label>
          <label>Giá/phút (đ)<input type="number" min="0" value={fareForm.pricePerMinute??''} onChange={e=>setFareForm({...fareForm,pricePerMinute:e.target.value})}/></label>
          <label>Đơn vị làm tròn (đ)<input type="number" min="1" value={fareForm.roundingUnit??''} onChange={e=>setFareForm({...fareForm,roundingUnit:e.target.value})}/></label>
          <label className="span-2">Ghi chú<input value={fareForm.note||''} onChange={e=>setFareForm({...fareForm,note:e.target.value})}/></label>
        </div><footer className="pricing-actions"><button type="button" className="button danger-outline" onClick={()=>deleteFare(fareForm)}><Trash2 size={16}/> Xóa bảng giá</button><button type="button" className="button button-primary" onClick={saveFare} disabled={saving}><CheckCircle2 size={16}/> Lưu vào MongoDB</button></footer></article>

        <article className="card pricing-card"><CardHeading title="Phí nền tảng" sub={feeForm?`${feeForm.serviceCode} · ${feeForm.areaCode} · phiên bản ${feeForm.version}`:'MongoDB chưa có cấu hình phí'} action={!feeForm?<button type="button" className="button button-small" onClick={()=>{setNewFee({serviceCode:serviceCode||fareForm.serviceCode,areaCode:areaCode||fareForm.areaCode,status:'DRAFT',bookingFee:'',customerServiceFee:'',driverFixedFee:'',paymentFeePercent:'',commissionType:'PERCENT',commissionValue:''});setShowCreateFee(true)}}><Plus size={15}/> Tạo phí</button>:null}/>{feeForm?<><div className="pricing-form-grid">
          <label>Trạng thái<select value={feeForm.status||'DRAFT'} onChange={e=>setFeeForm({...feeForm,status:e.target.value})}><option value="DRAFT">DRAFT</option><option value="ACTIVE">ACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select></label>
          <label>Phí đặt xe (đ)<input type="number" min="0" value={feeForm.bookingFee??''} onChange={e=>setFeeForm({...feeForm,bookingFee:e.target.value})}/></label>
          <label>Phí dịch vụ KH (đ)<input type="number" min="0" value={feeForm.customerServiceFee??''} onChange={e=>setFeeForm({...feeForm,customerServiceFee:e.target.value})}/></label>
          <label>Phí cố định tài xế (đ)<input type="number" min="0" value={feeForm.driverFixedFee??''} onChange={e=>setFeeForm({...feeForm,driverFixedFee:e.target.value})}/></label>
          <label>Phí thanh toán (%)<input type="number" min="0" step="0.1" value={feeForm.paymentFeePercent??''} onChange={e=>setFeeForm({...feeForm,paymentFeePercent:e.target.value})}/></label>
          <label>Loại hoa hồng<select value={feeForm.driverCommission?.type||'PERCENT'} onChange={e=>setFeeForm({...feeForm,driverCommission:{...feeForm.driverCommission,type:e.target.value}})}><option value="PERCENT">Phần trăm</option><option value="FIXED">Cố định</option></select></label>
          <label>Hoa hồng tài xế<input type="number" min="0" step="0.1" value={feeForm.driverCommission?.value??''} onChange={e=>setFeeForm({...feeForm,driverCommission:{...feeForm.driverCommission,value:e.target.value}})}/></label>
        </div><footer className="pricing-actions"><button type="button" className="button danger-outline" onClick={()=>deleteFee(feeForm)}><Trash2 size={16}/> Xóa phí</button><button type="button" className="button button-primary" onClick={saveFee} disabled={saving}><CheckCircle2 size={16}/> Lưu phí</button></footer></>:<p className="empty-note">Chưa có dữ liệu trong collection <code>platform_fees</code>. Web không tự chèn giá.</p>}</article>
      </section>

      <section className="card pricing-card pricing-tiers"><CardHeading title="Giá theo quãng đường" sub="Mỗi mốc được lưu trong fare_configs.distanceTiers" action={<button type="button" className="button button-small" onClick={addTier}><Plus size={15}/> Thêm mốc</button>}/><div className="table-scroll"><table><caption className="sr-only">Các mốc giá theo quãng đường</caption><thead><tr><th scope="col">Từ km</th><th scope="col">Đến km</th><th scope="col">Giá/km</th><th scope="col">Thao tác</th></tr></thead><tbody>{(fareForm.distanceTiers||[]).length?(fareForm.distanceTiers||[]).map((t,i)=><tr key={i}><td><input className="table-input" type="number" step="0.1" min="0" value={t.fromKm??''} onChange={e=>updateTier(i,'fromKm',e.target.value)}/></td><td><input className="table-input" type="number" step="0.1" min="0" placeholder="Không giới hạn" value={t.toKm??''} onChange={e=>updateTier(i,'toKm',e.target.value)}/></td><td><input className="table-input" type="number" min="0" value={t.pricePerKm??''} onChange={e=>updateTier(i,'pricePerKm',e.target.value)}/></td><td><IconButton label="Xóa mốc giá" className="danger" onClick={()=>removeTier(i)}><Trash2 size={16}/></IconButton></td></tr>):<tr><td colSpan="4" className="table-empty">Chưa có mốc giá. Nhấn “Thêm mốc” để nhập dữ liệu.</td></tr>}</tbody></table></div><footer className="pricing-actions"><button type="button" className="button button-primary" onClick={saveFare} disabled={saving}><CheckCircle2 size={16}/> Lưu các mốc vào MongoDB</button></footer></section>
    </>:<section className="card pricing-empty-state"><Database size={32}/><h2>Chưa có bảng giá để chỉnh sửa</h2><p>Trang quản trị không dùng số liệu mẫu. Hãy tạo mới hoặc chọn một document trong danh sách phía trên.</p><button type="button" className="button button-primary" onClick={()=>setShowCreateFare(true)}><Plus size={16}/> Tạo bảng giá</button></section>}

    <section className="pricing-layout pricing-bottom">
      <article className="card pricing-card"><CardHeading title="Phụ phí" sub={`${relatedSurcharges.length} document từ collection surcharges`} action={<button type="button" className="button button-small" onClick={openNewSurcharge}><Plus size={15}/> Thêm phụ phí</button>}/><div className="surcharge-list">{relatedSurcharges.length?relatedSurcharges.map(item=><div className="surcharge-row" key={item.id}><div><b>{item.name}</b><small>{item.code} · {item.serviceCode} · {item.calculationType}</small></div><div className="surcharge-display"><span>{item.calculationType==='PERCENT'?`${item.value}%`:item.calculationType==='MULTIPLIER'?`x${item.value}`:money(item.value)}</span><small>{item.status}</small></div><button type="button" className={'toggle-switch '+(item.status==='ACTIVE'?'on':'')} role="switch" aria-label={`Bật/tắt ${item.name}`} aria-checked={item.status==='ACTIVE'} onClick={()=>updateSurcharge(item,{status:item.status==='ACTIVE'?'INACTIVE':'ACTIVE'})}><span></span></button><div className="row-actions"><IconButton label="Sửa phụ phí" onClick={()=>setSurchargeEditor({...item,areaCodes:Array.isArray(item.areaCodes)?item.areaCodes:[]})}><Pencil size={16}/></IconButton><IconButton label="Xóa phụ phí" className="danger" onClick={()=>deleteSurcharge(item)}><Trash2 size={16}/></IconButton></div></div>):<div className="pricing-mini-empty">MongoDB chưa có phụ phí cho dịch vụ đang chọn.</div>}</div></article>

      <article className="card pricing-card fare-calculator"><CardHeading title="Máy tính thử giá" sub="Chỉ tính khi MongoDB có bảng giá ACTIVE"/><form onSubmit={calculateFare}><div className="pricing-form-grid"><label>Khoảng cách (km)<input type="number" min="0" step="0.1" placeholder="Nhập km" value={calc.distanceKm} onChange={e=>setCalc({...calc,distanceKm:e.target.value})}/></label><label>Thời gian (phút)<input type="number" min="0" step="1" placeholder="Nhập phút" value={calc.durationMinutes} onChange={e=>setCalc({...calc,durationMinutes:e.target.value})}/></label></div>
      {relatedSurcharges.filter(x=>x.status==='ACTIVE').length>0&&<fieldset className="surcharge-checks"><legend>Phụ phí ACTIVE trong MongoDB</legend>{relatedSurcharges.filter(x=>x.status==='ACTIVE').map(x=><label key={x.id}><input type="checkbox" checked={calc.surchargeCodes.includes(x.code)} onChange={e=>setCalc(c=>({...c,surchargeCodes:e.target.checked?[...c.surchargeCodes,x.code]:c.surchargeCodes.filter(code=>code!==x.code)}))}/>{x.name}</label>)}</fieldset>}
      <button className="button button-primary button-wide" type="submit" disabled={calcLoading||!activeFare}><BadgeDollarSign size={16}/>{calcLoading?' Đang tính...':' Tính giá từ MongoDB'}</button>{!activeFare&&<p className="empty-note">Cần có bảng giá ACTIVE để dùng máy tính thử giá.</p>}</form>
      {estimate&&<div className="fare-result" aria-live="polite"><div className="fare-total"><span>Khách dự kiến thanh toán</span><strong>{money(estimate.pricing.total)}</strong></div><dl><div><dt>Giá mở cửa</dt><dd>{money(estimate.pricing.baseFare)}</dd></div><div><dt>Quãng đường</dt><dd>{money(estimate.pricing.distanceFare)}</dd></div><div><dt>Thời gian</dt><dd>{money(estimate.pricing.timeFare)}</dd></div><div><dt>Phụ phí</dt><dd>{money(estimate.pricing.surcharge)}</dd></div><div><dt>Phí đặt xe</dt><dd>{money(estimate.pricing.bookingFee)}</dd></div><div><dt>Phí dịch vụ</dt><dd>{money(estimate.pricing.customerServiceFee)}</dd></div></dl>{estimate.fallbackToGlobal&&<p className="fallback-note">Đã dùng bảng giá GLOBAL vì {estimate.requestedAreaCode} chưa có bảng giá ACTIVE riêng.</p>}</div>}
      </article>
    </section>

    {saved&&<div className="pricing-save-toast" role="status">{saved}</div>}
    <ExportFieldModal open={showExport} onClose={()=>setShowExport(false)} title="Xuất cấu hình giá cước" filename="TH79_iMove_Gia_cuoc.xlsx" sheetName="Giá cước" columns={exportColumns} rows={exportRows}/>

    {showCreateFare&&<div className="modal-backdrop" role="presentation" onMouseDown={()=>setShowCreateFare(false)}><section className="modal pricing-create-modal" role="dialog" aria-modal="true" aria-labelledby="create-fare-title" onMouseDown={e=>e.stopPropagation()}><header><div><h2 id="create-fare-title">Tạo bảng giá mới</h2><p>Không có giá điền sẵn. Mọi số liệu dưới đây do bạn nhập và sẽ lưu trực tiếp vào MongoDB.</p></div><IconButton label="Đóng" onClick={()=>setShowCreateFare(false)}><X size={18}/></IconButton></header><form onSubmit={createFare}><div className="form-grid">
      <label>Mã dịch vụ<input required list="pricing-service-list" value={newFare.serviceCode} onChange={e=>setNewFare({...newFare,serviceCode:e.target.value})} placeholder="VD: BIKE"/><datalist id="pricing-service-list">{serviceOptions.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}</datalist></label>
      <label>Tên dịch vụ<input value={newFare.serviceName} onChange={e=>setNewFare({...newFare,serviceName:e.target.value})} placeholder="Chỉ cần nhập nếu là dịch vụ mới"/></label>
      <label>Mã khu vực<input required list="pricing-area-list" value={newFare.areaCode} onChange={e=>setNewFare({...newFare,areaCode:e.target.value})} placeholder="VD: HCM hoặc GLOBAL"/><datalist id="pricing-area-list">{areaOptions.map(a=><option key={a.code} value={a.code}>{a.name}</option>)}</datalist></label>
      <label>Tên khu vực<input value={newFare.areaName} onChange={e=>setNewFare({...newFare,areaName:e.target.value})} placeholder="Chỉ cần nhập nếu là khu vực mới"/></label>
      <label>Trạng thái<select value={newFare.status} onChange={e=>setNewFare({...newFare,status:e.target.value})}><option value="DRAFT">DRAFT</option><option value="ACTIVE">ACTIVE</option></select></label>
      <label>Giá mở cửa (đ)<input required type="number" min="0" value={newFare.baseFare} onChange={e=>setNewFare({...newFare,baseFare:e.target.value})}/></label>
      <label>Km cơ bản<input required type="number" min="0" step="0.1" value={newFare.baseDistanceKm} onChange={e=>setNewFare({...newFare,baseDistanceKm:e.target.value})}/></label>
      <label>Giá tối thiểu (đ)<input required type="number" min="0" value={newFare.minimumFare} onChange={e=>setNewFare({...newFare,minimumFare:e.target.value})}/></label>
      <label>Giá/phút (đ)<input required type="number" min="0" value={newFare.pricePerMinute} onChange={e=>setNewFare({...newFare,pricePerMinute:e.target.value})}/></label>
      <label>Đơn vị làm tròn (đ)<input required type="number" min="1" value={newFare.roundingUnit} onChange={e=>setNewFare({...newFare,roundingUnit:e.target.value})}/></label>
      <label className="span-2">Ghi chú<input value={newFare.note} onChange={e=>setNewFare({...newFare,note:e.target.value})}/></label>
      </div><footer><button type="button" className="button" onClick={()=>setShowCreateFare(false)}>Hủy</button><button type="submit" className="button button-primary" disabled={saving}><CheckCircle2 size={16}/> Tạo & lưu MongoDB</button></footer></form></section></div>}

    {showCreateFee&&<div className="modal-backdrop" role="presentation" onMouseDown={()=>setShowCreateFee(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-fee-title" onMouseDown={e=>e.stopPropagation()}><header><div><h2 id="create-fee-title">Tạo phí nền tảng</h2><p>Các trường tiền để trống nếu bạn chưa muốn áp dụng.</p></div><IconButton label="Đóng" onClick={()=>setShowCreateFee(false)}><X size={18}/></IconButton></header><form onSubmit={createFee}><div className="form-grid">
      <label>Mã dịch vụ<input required value={newFee.serviceCode} onChange={e=>setNewFee({...newFee,serviceCode:e.target.value})}/></label><label>Mã khu vực<input required value={newFee.areaCode} onChange={e=>setNewFee({...newFee,areaCode:e.target.value})}/></label>
      <label>Trạng thái<select value={newFee.status} onChange={e=>setNewFee({...newFee,status:e.target.value})}><option value="DRAFT">DRAFT</option><option value="ACTIVE">ACTIVE</option></select></label><label>Phí đặt xe (đ)<input type="number" min="0" value={newFee.bookingFee} onChange={e=>setNewFee({...newFee,bookingFee:e.target.value})}/></label>
      <label>Phí dịch vụ KH (đ)<input type="number" min="0" value={newFee.customerServiceFee} onChange={e=>setNewFee({...newFee,customerServiceFee:e.target.value})}/></label><label>Phí cố định tài xế (đ)<input type="number" min="0" value={newFee.driverFixedFee} onChange={e=>setNewFee({...newFee,driverFixedFee:e.target.value})}/></label>
      <label>Phí thanh toán (%)<input type="number" min="0" step="0.1" value={newFee.paymentFeePercent} onChange={e=>setNewFee({...newFee,paymentFeePercent:e.target.value})}/></label><label>Loại hoa hồng<select value={newFee.commissionType} onChange={e=>setNewFee({...newFee,commissionType:e.target.value})}><option value="PERCENT">Phần trăm</option><option value="FIXED">Cố định</option></select></label>
      <label>Hoa hồng tài xế<input required type="number" min="0" step="0.1" value={newFee.commissionValue} onChange={e=>setNewFee({...newFee,commissionValue:e.target.value})}/></label>
      </div><footer><button type="button" className="button" onClick={()=>setShowCreateFee(false)}>Hủy</button><button type="submit" className="button button-primary" disabled={saving}>Tạo phí</button></footer></form></section></div>}

    {surchargeEditor&&<div className="modal-backdrop" role="presentation" onMouseDown={()=>setSurchargeEditor(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="surcharge-title" onMouseDown={e=>e.stopPropagation()}><header><div><h2 id="surcharge-title">{surchargeEditor.id?'Sửa phụ phí':'Thêm phụ phí'}</h2><p>Dữ liệu lưu trong collection surcharges.</p></div><IconButton label="Đóng" onClick={()=>setSurchargeEditor(null)}><X size={18}/></IconButton></header><form onSubmit={saveSurchargeEditor}><div className="form-grid">
      <label>Mã phụ phí<input required value={surchargeEditor.code||''} onChange={e=>setSurchargeEditor({...surchargeEditor,code:e.target.value})}/></label><label>Tên phụ phí<input required value={surchargeEditor.name||''} onChange={e=>setSurchargeEditor({...surchargeEditor,name:e.target.value})}/></label>
      <label>Mã dịch vụ<input required value={surchargeEditor.serviceCode||''} onChange={e=>setSurchargeEditor({...surchargeEditor,serviceCode:e.target.value})}/></label><label>Khu vực áp dụng<input value={(surchargeEditor.areaCodes||[]).join(', ')} onChange={e=>setSurchargeEditor({...surchargeEditor,areaCodes:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} placeholder="GLOBAL, HCM"/></label>
      <label>Kiểu tính<select value={surchargeEditor.calculationType||'FIXED'} onChange={e=>setSurchargeEditor({...surchargeEditor,calculationType:e.target.value})}><option value="FIXED">Số tiền cố định</option><option value="PERCENT">Phần trăm</option><option value="MULTIPLIER">Hệ số nhân</option></select></label><label>Giá trị<input required type="number" step="0.1" value={surchargeEditor.value??''} onChange={e=>setSurchargeEditor({...surchargeEditor,value:e.target.value})}/></label>
      <label>Trạng thái<select value={surchargeEditor.status||'INACTIVE'} onChange={e=>setSurchargeEditor({...surchargeEditor,status:e.target.value})}><option value="INACTIVE">INACTIVE</option><option value="ACTIVE">ACTIVE</option></select></label>
      </div><footer><button type="button" className="button" onClick={()=>setSurchargeEditor(null)}>Hủy</button><button type="submit" className="button button-primary">Lưu phụ phí</button></footer></form></section></div>}
  </>
}

function PaymentRevenueChart({rows=[]}){
  const data=(Array.isArray(rows)?rows:[]).slice(-14);
  if(!data.length)return <div className="payment-chart-empty">Chưa có dữ liệu doanh thu để vẽ biểu đồ.</div>;
  const width=760,height=250,padX=24,padY=24;
  const values=data.map(item=>Math.max(0,mongoNumber(item.value)));
  const max=Math.max(1,...values);
  const step=data.length>1?(width-padX*2)/(data.length-1):0;
  const points=values.map((value,index)=>({x:padX+step*index,y:height-padY-(value/max)*(height-padY*2)}));
  const line=points.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area=`M ${points[0].x.toFixed(1)} ${(height-padY).toFixed(1)} ${line.replace(/^M /,'L ')} L ${points[points.length-1].x.toFixed(1)} ${(height-padY).toFixed(1)} Z`;
  return <div className="payment-chart-wrap">
    <svg className="payment-line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Biểu đồ doanh thu">
      <defs><linearGradient id="paymentAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef3340" stopOpacity=".2"/><stop offset="100%" stopColor="#ef3340" stopOpacity=".02"/></linearGradient></defs>
      {[0,.25,.5,.75,1].map((ratio)=><line key={ratio} x1={padX} x2={width-padX} y1={padY+(height-padY*2)*ratio} y2={padY+(height-padY*2)*ratio} className="payment-chart-grid"/>)}
      <path d={area} fill="url(#paymentAreaGradient)"/>
      <path d={line} className="payment-chart-line"/>
      {points.map((point,index)=><circle key={index} cx={point.x} cy={point.y} r="4" className="payment-chart-dot"/>)}
    </svg>
    <div className="payment-chart-labels">{data.map((item,index)=><span key={`${item.day}-${index}`}>{safeText(item.day,'—')}</span>)}</div>
  </div>
}

function Payments(){
  const [rows,setRows]=React.useState(read('payments'));
  const [q,setQ]=React.useState('');
  const [showExport,setShowExport]=React.useState(false);
  const filtered=rows.filter(r=>`${r.id||''} ${r.tripId||''} ${r.customer||''} ${r.method||''}`.toLowerCase().includes(q.toLowerCase()));
  function commit(next){setRows(next);write('payments',next)}
  const successRows=rows.filter(x=>x.status==='success');
  const success=successRows.reduce((sum,row)=>sum+Number(row.amount||0),0);
  const failedRows=rows.filter(x=>['failed','cancelled'].includes(String(x.status||'').toLowerCase()));
  const pendingRows=rows.filter(x=>x.status==='pending');
  const recent=[...rows].sort((a,b)=>{const ta=new Date(a?.createdAt||0).getTime()||0;const tb=new Date(b?.createdAt||0).getTime()||0;return tb-ta}).slice(0,4);
  const revenue=read('revenue');
  const exportColumns=[
    {key:'id',label:'Mã giao dịch'},{key:'tripId',label:'Mã chuyến'},{key:'customer',label:'Khách hàng'},{key:'amount',label:'Số tiền'},
    {key:'method',label:'Phương thức'},{key:'createdAt',label:'Thời gian'},{key:'status',label:'Trạng thái',get:r=>labels[r.status]||r.status}
  ];
  return <>
    <PageIntro title="Thanh toán" description="Quản lý giao dịch, doanh thu và trạng thái đối soát của hệ thống." actions={<button type="button" className="button" onClick={()=>setShowExport(true)}><Download size={16}/> Xuất Excel</button>}/>

    <section className="payment-kpi-grid" aria-label="Tổng hợp thanh toán">
      <article className="payment-kpi"><span className="payment-kpi-icon red"><CircleDollarSign size={20}/></span><div><small>Tổng doanh thu</small><strong>{money(success)}</strong><p>{successRows.length} giao dịch đã xác nhận</p></div></article>
      <article className="payment-kpi"><span className="payment-kpi-icon neutral"><WalletCards size={20}/></span><div><small>Tổng giao dịch</small><strong>{rows.length}</strong><p>{pendingRows.length} giao dịch chờ đối soát</p></div></article>
      <article className="payment-kpi"><span className="payment-kpi-icon green"><CheckCircle2 size={20}/></span><div><small>Giao dịch thành công</small><strong>{successRows.length}</strong><p>{rows.length?`${(successRows.length/rows.length*100).toFixed(1)}%`:'0%'}</p></div></article>
      <article className="payment-kpi"><span className="payment-kpi-icon danger"><X size={20}/></span><div><small>Giao dịch thất bại</small><strong>{failedRows.length}</strong><p>{rows.length?`${(failedRows.length/rows.length*100).toFixed(1)}%`:'0%'}</p></div></article>
    </section>

    <section className="payment-overview-grid">
      <article className="card payment-chart-card">
        <CardHeading title="Doanh thu theo ngày" sub="Xu hướng doanh thu từ dữ liệu MongoDB" action={<span className="date-chip"><CalendarDays size={15}/> {Math.min(14,revenue.length||14)} ngày gần đây</span>}/>
        <PaymentRevenueChart rows={revenue}/>
      </article>
      <article className="card payment-recent-card">
        <CardHeading title="Thanh toán gần đây" sub="Chỉ hiển thị 4 giao dịch mới nhất" action={<button className="text-button" type="button" onClick={()=>setQ('')}>Xem tất cả <ChevronRight size={14}/></button>}/>
        <div className="payment-recent-list">{recent.length?recent.map((row)=><div className="payment-recent-row" key={row.id}><span className="payment-row-icon"><WalletCards size={16}/></span><div className="payment-row-main"><span className="payment-row-id">{row.id}</span><small>{paymentLabel(row.method)} · {dateLabel(row.createdAt)}</small></div><span className="payment-row-amount">{money(row.amount)}</span><Status value={row.status}/></div>):<div className="payment-chart-empty">Chưa có giao dịch.</div>}</div>
      </article>
    </section>

    <section className="card data-card payment-table-card"><CardHeading title="Danh sách giao dịch" sub={`${filtered.length} giao dịch`} action={<div className="filter-tools"><SearchField value={q} onChange={setQ} placeholder="Mã giao dịch, khách hàng..."/><button type="button" className="button button-small"><SlidersHorizontal size={15}/> Lọc</button></div>}/><TableShell caption="Lịch sử giao dịch TH79 iMove"><thead><tr><th scope="col">Mã giao dịch</th><th scope="col">Thời gian</th><th scope="col">Khách hàng</th><th scope="col">Chuyến xe</th><th scope="col">Phương thức</th><th scope="col">Số tiền</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><span className="table-primary">{r.id}</span></td><td>{dateLabel(r.createdAt)}</td><td>{r.customer}</td><td>{r.tripId}</td><td>{paymentLabel(r.method)}</td><td><span className="table-primary">{money(r.amount)}</span></td><td><Status value={r.status}/></td><td>{r.status==='pending'?<button className="button button-success button-small" onClick={()=>commit(rows.map(x=>x.id===r.id?{...x,status:'success'}:x))}>Xác nhận</button>:<button className="table-action-button" title="Đưa về chờ đối soát" onClick={()=>commit(rows.map(x=>x.id===r.id?{...x,status:'pending'}:x))}><MoreHorizontal size={17}/></button>}</td></tr>)}</tbody></TableShell></section>
    <ExportFieldModal open={showExport} onClose={()=>setShowExport(false)} title="Xuất đối soát thanh toán" filename="TH79_iMove_Doi_soat_thanh_toan.xlsx" sheetName="Đối soát thanh toán" columns={exportColumns} rows={filtered}/>
  </>
}

function Reports(){
  const trips=read('trips');const drivers=read('drivers');const customers=read('customers').filter(x=>hasRole(x,'CUSTOMER'));const payments=read('payments');const revenue=read('revenue');const max=Math.max(1,...revenue.map(x=>Number(x.value)||0));const services=Object.entries(trips.reduce((a,t)=>(a[t.service]=(a[t.service]||0)+1,a),{}));const [showExport,setShowExport]=React.useState(false);
  const revenue7=revenue.length?revenue.reduce((s,x)=>s+Number(x.value||0),0):payments.filter(x=>x.status==='success').reduce((s,x)=>s+Number(x.amount||0),0);const paid=payments.filter(x=>x.status==='success').reduce((s,x)=>s+Number(x.amount||0),0); const completed=trips.filter(x=>x.status==='completed').length; const completionRate=trips.length?`${(completed/trips.length*100).toFixed(1).replace('.',',')}%`:'0%'; const rated=drivers.filter(d=>Number(d.rating)>0); const avgRating=rated.length?(rated.reduce((a,d)=>a+Number(d.rating||0),0)/rated.length).toFixed(1)+'/5':'0/5';
  const reportRows=[{
    totalCustomers:customers.length,totalDrivers:drivers.length,onlineDrivers:drivers.filter(driverIsOnline).length,totalTrips:trips.length,
    completedTrips:completed,revenue7,paid,avgDriverRating:avgRating,completionRate
  }];
  const exportColumns=[
    {key:'totalCustomers',label:'Tổng khách hàng'},{key:'totalDrivers',label:'Tổng tài xế'},{key:'onlineDrivers',label:'Tài xế online'},
    {key:'totalTrips',label:'Tổng chuyến'},{key:'completedTrips',label:'Chuyến hoàn thành'},{key:'revenue7',label:'Doanh thu 7 ngày'},
    {key:'paid',label:'Thanh toán đã xác nhận'},{key:'completionRate',label:'Tỷ lệ hoàn thành'},{key:'avgDriverRating',label:'Điểm tài xế trung bình'}
  ];
  return <><PageIntro title="Báo cáo" description="Tổng hợp dữ liệu hiện có trên MongoDB Atlas." actions={<button type="button" className="button button-primary" onClick={()=>setShowExport(true)}><Download size={16}/> Tải báo cáo Excel</button>}/>
    <section className="report-grid"><article className="card report-chart"><CardHeading title="Doanh thu 7 ngày" sub="Tổng quan xu hướng theo ngày"/><div className="large-bars" role="img" aria-label="Biểu đồ doanh thu 7 ngày">{revenue.map((r,i)=><div className="large-bar-col" key={r.day}><span className={i===6?'large-bar active':'large-bar'} style={{height:`${r.value/max*100}%`}}></span><small>{r.day}</small></div>)}</div></article><article className="card report-summary"><CardHeading title="Cơ cấu dịch vụ" sub="Tỷ trọng chuyến theo loại dịch vụ"/><div className="service-bars">{services.map(([name,count],i)=><div key={name}><header><span>{name}</span><b>{count} chuyến</b></header><div><i style={{width:`${Math.max(16,count/Math.max(1,trips.length)*100)}%`}}></i></div></div>)}</div></article></section>
    <section className="insight-grid" aria-label="Các chỉ số phân tích"><article><span>Doanh thu 7 ngày</span><b>{money(revenue7)}</b><small>Dữ liệu MongoDB</small></article><article><span>Doanh thu/chuyến TB</span><b>{money(trips.length?Math.round(paid/trips.length):0)}</b><small>Tính từ dữ liệu hiện có</small></article><article><span>Tỷ lệ hoàn thành</span><b>{completionRate}</b><small>Mục tiêu ≥ 95%</small></article><article><span>Điểm tài xế TB</span><b>{avgRating}</b><small>Điểm trung bình tài xế</small></article></section>
    <ExportFieldModal open={showExport} onClose={()=>setShowExport(false)} title="Chọn chỉ số cần xuất báo cáo" filename="TH79_iMove_Bao_cao_tong_hop.xlsx" sheetName="Báo cáo tổng hợp" columns={exportColumns} rows={reportRows}/>
  </>
}

function SettingsPage(){
  const [form,setForm]=React.useState(read('settings'));const [saved,setSaved]=React.useState(false);
  function save(e){e.preventDefault();write('settings',form);setSaved(true);setTimeout(()=>setSaved(false),1500)}
  return <><PageIntro title="Cài đặt" description="Cấu hình thương hiệu, vận hành và kết nối dữ liệu của hệ thống."/>
    <section className="settings-grid"><form className="card settings-card" onSubmit={save}><CardHeading title="Thông tin hệ thống" sub="Thiết lập dùng cho trang quản trị"/><div className="form-grid"><label className="span-2">Tên công ty<input value={form.companyName} onChange={e=>setForm({...form,companyName:e.target.value})}/></label><label>Tên thương hiệu<input value={form.brandName} onChange={e=>setForm({...form,brandName:e.target.value})}/></label><label>Hotline<input value={form.hotline} onChange={e=>setForm({...form,hotline:e.target.value})}/></label><label className="span-2 checkbox-line"><input type="checkbox" checked={form.autoAssign} onChange={e=>setForm({...form,autoAssign:e.target.checked})}/> Tự động đề xuất tài xế gần nhất</label></div><footer className="form-footer"><button className="button button-primary">Lưu cài đặt</button>{saved&&<span className="saved-note" role="status">Đã lưu</span>}</footer></form>
      <aside className="card data-mode" aria-labelledby="data-mode-title"><span className="data-icon"><Database size={24}/></span><h2 id="data-mode-title">Chế độ dữ liệu</h2><strong>MONGODB ATLAS / API</strong><p>Trang đang đọc và ghi dữ liệu thông qua backend Node.js. Chuỗi kết nối MongoDB chỉ nằm trong <code>server/.env</code> và không được đưa xuống trình duyệt.</p><div className="divider"></div><h3>Kết nối hiện tại</h3><p>Database mặc định: <b>TH79_iMove</b>. Có thể đổi tên database trong <code>server/.env</code>.</p><button type="button" className="button button-wide" onClick={async()=>{try{await syncFromServer();window.alert('Đã tải lại dữ liệu từ MongoDB.')}catch(e){window.alert('Không thể kết nối MongoDB: '+e.message)}}}><RefreshCw size={16}/> Làm mới dữ liệu MongoDB</button></aside></section>
  </>
}

function AccessDenied(){
  return <section className="card access-denied"><ShieldCheck size={34}/><h1>Không có quyền truy cập</h1><p>Tài khoản hiện tại chưa được cấp quyền sử dụng chức năng này. Hãy liên hệ Super Admin để được phân quyền.</p></section>
}

function AdminApp(){
  const [logged,setLogged]=React.useState(hasCoreAdminSession());
  const [page,setPage]=React.useState('overview');
  const [dbState,setDbState]=React.useState({loading:true,error:''});
  const [adminAccess,setAdminAccess]=React.useState(null);

  const loadAdminAccess=React.useCallback(async()=>{
    if(!hasCoreAdminSession()) return;
    try{setAdminAccess(await adminApiRequest('/admin-access/me'))}
    catch(error){console.warn('Không tải được phân quyền quản trị:',error.message);setAdminAccess(null)}
  },[]);

  const loadDatabase=React.useCallback(async()=>{
    setDbState({loading:true,error:''});
    try{await Promise.all([syncFromServer(),loadAdminAccess()]);setDbState({loading:false,error:''})}
    catch(error){setDbState({loading:false,error:error.message||'Không thể kết nối MongoDB'})}
  },[loadAdminAccess]);

  React.useEffect(()=>{if(logged)loadDatabase()},[logged,loadDatabase]);

  // Tự đồng bộ MongoDB để trạng thái Online/Offline phản ánh hoạt động của app tài xế.
  // Không hiển thị popup nếu một lần polling bị lỗi; lần tiếp theo sẽ thử lại.
  React.useEffect(()=>{
    if(!logged) return undefined;
    let busy=false;
    const refresh=async()=>{
      if(busy||document.visibilityState==='hidden') return;
      busy=true;
      try{await syncDriversFromServer()}catch(error){console.warn('Không thể làm mới trạng thái tài xế:',error.message)}
      finally{busy=false}
    };
    const timer=window.setInterval(refresh,10000);
    const onVisibility=()=>{if(document.visibilityState==='visible')refresh()};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility)};
  },[logged]);

  React.useEffect(()=>{
    const expired=()=>{coreAdminLogout();setAdminAccess(null);setLogged(false)};
    window.addEventListener('imove:admin-auth-expired',expired);
    return()=>window.removeEventListener('imove:admin-auth-expired',expired);
  },[]);

  if(!logged) return <Login onLogin={()=>{setLogged(true);setPage('overview')}}/>;
  if(dbState.loading) return <main className="connection-screen"><Database size={42}/><h1>Đang kết nối MongoDB Atlas...</h1><p>TH79 iMove Admin đang tải dữ liệu từ backend.</p></main>;
  if(dbState.error) return <main className="connection-screen error"><Database size={42}/><h1>Chưa kết nối được MongoDB</h1><p>{dbState.error}</p><button type="button" className="button button-primary" onClick={loadDatabase}><RefreshCw size={16}/> Thử kết nối lại</button><small>Kiểm tra server/.env, MongoDB Atlas Network Access và Terminal chạy API.</small></main>;

  const can=(permission)=>!adminAccess||hasPermission(adminAccess,permission);
  let view=<DashboardPage access={adminAccess}/>;
  if(page==='production-health')view=can('settings.view')?<ProductionHealthPage/>:<PermissionDenied/>;
  if(page==='operations')view=can('bookings.view')?<CoreOperationsPage/>:<PermissionDenied/>;
  if(page==='matching')view=can('matching.view')?<MatchingControlPage access={adminAccess}/>:<PermissionDenied/>;
  if(page==='dispatch69')view=can('matching.view')?<DispatchCenterPage/>:<PermissionDenied/>;
  if(page==='support')view=can('support.view')?<SupportCenterPage access={adminAccess}/>:<PermissionDenied/>;
  if(page==='broadcasts')view=can('broadcast.view')?<BroadcastCenterPage/>:<PermissionDenied/>;
  if(page==='trust')view=can('trust.view')?<TrustSafetyPage/>:<PermissionDenied/>;
  if(page==='customers')view=can('users.view')?<CustomersPage/>:<PermissionDenied/>;
  if(page==='drivers')view=can('drivers.view')?<Drivers/>:<PermissionDenied/>;
  if(page==='driver-experience')view=can('drivers.view')?<DriverExperiencePage/>:<PermissionDenied/>;
  if(page==='kyc')view=can('drivers.review')?<DriverManagement/>:<PermissionDenied/>;
  if(page==='trips')view=can('bookings.view')?<TripsPage/>:<PermissionDenied/>;
  if(page==='pricing')view=can('pricing.view')?<ServicePricingPage/>:<PermissionDenied/>;
  if(page==='merchants')view=can('merchants.view')?<MerchantsPage/>:<PermissionDenied/>;
  if(page==='commerce-orders')view=can('orders.view')?<CommerceOrdersPage/>:<PermissionDenied/>;
  if(page==='promotions')view=can('promotions.view')?<PromotionsAdminPage/>:<PermissionDenied/>;
  if(page==='payments')view=can('payments.view')?<PaymentsV14Page/>:<PermissionDenied/>;
  if(page==='driver-point-topups')view=can('drivers.view')?<DriverPointTopupsPage/>:<PermissionDenied/>;
  if(page==='settlement')view=can('settlements.view')?<SettlementPage/>:<PermissionDenied/>;
  if(page==='reports')view=can('reports.view')?<AnalyticsReportsPage/>:<PermissionDenied/>;
  if(page==='settings')view=can('settings.view')?<EnterpriseSettingsPage/>:<PermissionDenied/>;
  if(page==='admin-profile')view=<ProfilePage access={adminAccess} onAccessChanged={setAdminAccess} onLogout={()=>{coreAdminLogout();setAdminAccess(null);setLogged(false)}}/>;
  if(page==='admin-accounts')view=can('admins.view')?<AdminAccess mode="accounts" access={adminAccess} onAccessChanged={setAdminAccess}/>:<PermissionDenied/>;
  if(page==='admin-roles')view=can('roles.manage')?<AdminAccess mode="roles" access={adminAccess} onAccessChanged={setAdminAccess}/>:<PermissionDenied/>;
  if(page==='admin-audit')view=can('audit.view')?<AuditLogPage/>:<PermissionDenied/>;
  return <Shell page={page} setPage={setPage} access={adminAccess} onLogout={()=>{coreAdminLogout();setAdminAccess(null);setLogged(false)}}>{view}</Shell>;
}


export default function App(){
  const pathname=window.location.pathname.replace(/\/+$/, '')||'/';
  if(pathname==='/privacy') return <PrivacyPolicyPage/>;
  return <AdminApp/>;
}
