import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dgram from 'dgram';
import os from 'os';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { resolveRuntimeConfig, localCoreCandidate } from './runtime_config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin server uses its own explicit environment file. Generic PORT is intentionally ignored
// so an old PORT=5050 can never make Admin Gateway collide with Core Backend.
const adminEnvPath = path.join(__dirname, '.env');
dotenv.config({ path: adminEnvPath, override: true });

// Reuse the Backend MongoDB credentials by default to avoid keeping two copies of secrets.
const backendEnvFile = String(process.env.BACKEND_ENV_FILE || '../../imove_backend/.env').trim();
const backendEnvPath = path.resolve(__dirname, backendEnvFile);
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: false });
}

const runtime = resolveRuntimeConfig(process.env);
const PORT = runtime.adminPort;
const CORE_HTTP_PORT = runtime.corePort;
const CORE_BACKEND_URL = runtime.coreBackendUrl;
const CORE_DISCOVERY_PORT = Number(process.env.CORE_DISCOVERY_PORT || 5051);

const DB_NAME = process.env.MONGODB_DB || 'th79_imove';
const MONGODB_URI = String(process.env.MONGODB_URI_OVERRIDE || process.env.MONGODB_URI || '').trim();
const CORE_DISCOVERY_TIMEOUT_MS = Math.max(300, Number(process.env.CORE_DISCOVERY_TIMEOUT_MS || 1300));
const CORE_CACHE_MS = Math.max(5000, Number(process.env.CORE_CACHE_MS || 60000));
const CORE_LAN_SCAN_ENABLED = String(process.env.CORE_LAN_SCAN_ENABLED || 'true').toLowerCase() !== 'false';
const DISCOVERY_MAGIC = 'TH79_IMOVE_DISCOVER_V1';

function isLoopbackCoreUrl(url) {
  return /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::|\/|$)/i.test(String(url || ''));
}


if (!MONGODB_URI) {
  console.error('❌ Thiếu MONGODB_URI. Hãy cấu hình imove_backend/.env hoặc MONGODB_URI_OVERRIDE trong imove_admin/server/.env');
  process.exit(1);
}

const collectionMap = {
  customers: process.env.COLLECTION_CUSTOMERS || 'customers',
  drivers: process.env.COLLECTION_DRIVERS || 'drivers',
  trips: process.env.COLLECTION_TRIPS || 'trips',
  payments: process.env.COLLECTION_PAYMENTS || 'payments',
  revenue: process.env.COLLECTION_REVENUE || 'revenue'
};
const allowedArrayKeys = new Set(Object.keys(collectionMap));

const defaultSettings = {
  companyName: 'Công ty TNHH Đầu tư T&H 79',
  brandName: 'TH79 iMove',
  hotline: '0335555066',
  autoAssign: true
};


let coreCache = {
  baseUrl: null,
  source: null,
  discoveredAt: 0,
  lastError: null,
  attempts: [],
};
let coreDiscoveryPromise = null;

function privateIpv4(address) {
  if (!address) return false;
  const p = address.split('.').map(Number);
  if (p.length !== 4 || p.some(Number.isNaN)) return false;
  return p[0] === 10 ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168);
}

function ipToInt(ip) {
  return ip.split('.').reduce((acc, part) => (((acc << 8) >>> 0) + Number(part)) >>> 0, 0) >>> 0;
}

function intToIp(value) {
  return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
}

function localInterfaces() {
  const result = [];
  for (const [name, items] of Object.entries(os.networkInterfaces())) {
    for (const item of items || []) {
      if (item.family !== 'IPv4' || item.internal || !privateIpv4(item.address)) continue;
      result.push({
        name,
        address: item.address,
        netmask: item.netmask || '255.255.255.0',
      });
    }
  }
  return result;
}

function directedBroadcast(address, netmask) {
  try {
    const ip = ipToInt(address);
    const mask = ipToInt(netmask);
    return intToIp((ip | (~mask >>> 0)) >>> 0);
  } catch (_) {
    return null;
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 900) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkCore(baseUrl, timeoutMs = 900) {
  try {
    const response = await fetchWithTimeout(`${baseUrl}/health`, {}, timeoutMs);
    const payload = await response.json().catch(() => null);
    return Boolean(payload?.backend === true || payload?.service === 'TH79_IMOVE_CORE');
  } catch (_) {
    return false;
  }
}

function addAttempt(source, target, ok, note = null) {
  coreCache.attempts.push({ source, target, ok, note, at: new Date().toISOString() });
  if (coreCache.attempts.length > 40) coreCache.attempts = coreCache.attempts.slice(-40);
}

async function testCandidates(candidates, source, timeoutMs = 900) {
  const unique = [...new Set(candidates.filter(Boolean).map(x => String(x).replace(/\/+$/, '')))];
  if (!unique.length) return null;

  let cursor = 0;
  let found = null;
  const concurrency = Math.min(12, unique.length);

  async function worker() {
    while (!found && cursor < unique.length) {
      const target = unique[cursor++];
      const ok = await checkCore(target, timeoutMs);
      addAttempt(source, target, ok);
      if (ok) found = target;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return found;
}

async function discoverByAtlasRegistry() {
  if (!mongoose.connection.db) return null;

  try {
    const cutoff = new Date(Date.now() - 120000);
    const rows = await mongoose.connection.db
      .collection('service_registry')
      .find({ service: 'TH79_IMOVE_CORE', lastSeenAt: { $gte: cutoff } })
      .sort({ lastSeenAt: -1 })
      .limit(10)
      .toArray();

    const candidates = [];
    for (const row of rows) {
      if (row.publicUrl) candidates.push(String(row.publicUrl));
      const port = Number(row.httpPort || CORE_HTTP_PORT);
      if (row.hostname) candidates.push(`http://${row.hostname}:${port}`);
      for (const item of row.addresses || []) {
        const ip = typeof item === 'string' ? item : item?.address;
        if (privateIpv4(ip)) candidates.push(`http://${ip}:${port}`);
      }
    }

    return await testCandidates(candidates, 'ATLAS_SERVICE_REGISTRY', 1100);
  } catch (error) {
    addAttempt('ATLAS_SERVICE_REGISTRY', 'service_registry', false, error.message);
    return null;
  }
}

async function discoverByUdp() {
  return new Promise(resolve => {
    const socket = dgram.createSocket('udp4');
    const seen = new Set();
    let finished = false;

    const finish = value => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { socket.close(); } catch (_) {}
      resolve(value || null);
    };

    socket.on('error', error => {
      addAttempt('UDP_AUTO_DISCOVERY', `udp:${CORE_DISCOVERY_PORT}`, false, error.message);
      finish(null);
    });

    socket.on('message', async (buffer, rinfo) => {
      if (seen.has(rinfo.address)) return;
      seen.add(rinfo.address);

      try {
        const payload = JSON.parse(buffer.toString('utf8'));
        if (payload?.service !== 'TH79_IMOVE_CORE') return;
        const port = Number(payload.port || CORE_HTTP_PORT);
        const baseUrl = `http://${rinfo.address}:${port}`;
        const ok = await checkCore(baseUrl, 900);
        addAttempt('UDP_AUTO_DISCOVERY', baseUrl, ok);
        if (ok) finish(baseUrl);
      } catch (_) {}
    });

    const timer = setTimeout(() => finish(null), CORE_DISCOVERY_TIMEOUT_MS);

    socket.bind(0, '0.0.0', () => {
      try { socket.setBroadcast(true); } catch (_) {}
      const messages = [
        Buffer.from('TH79_IMOVE_DISCOVER_V2', 'utf8'),
        Buffer.from('TH79_IMOVE_DISCOVER_V1', 'utf8'),
      ];
      const targets = new Set(['255.255.255.255']);

      for (const item of localInterfaces()) {
        const broadcast = directedBroadcast(item.address, item.netmask);
        if (broadcast) targets.add(broadcast);
      }

      for (const target of targets) {
        for (const message of messages) {
          socket.send(message, CORE_DISCOVERY_PORT, target, () => {});
        }
      }
    });
  });
}

function subnetCandidates() {
  const result = new Set();

  // Fast /24 around every active interface. This is intentionally bounded.
  for (const item of localInterfaces()) {
    const parts = item.address.split('.');
    if (parts.length !== 4) continue;
    const prefix = `${parts[0]}.${parts[1]}.${parts[2]}.`;
    for (let i = 1; i <= 254; i += 1) {
      const ip = `${prefix}${i}`;
      if (ip !== item.address) result.add(ip);
    }
  }

  return [...result];
}

async function discoverByLanScan() {
  if (!CORE_LAN_SCAN_ENABLED) return null;
  const candidates = subnetCandidates().map(ip => `http://${ip}:${CORE_HTTP_PORT}`);
  return await testCandidates(candidates, 'LAN_SCAN_FALLBACK', 330);
}

async function resolveCoreBackend(force = false) {
  const now = Date.now();

  if (!force && coreCache.baseUrl && now - coreCache.discoveredAt < CORE_CACHE_MS) {
    if (await checkCore(coreCache.baseUrl, 700)) return coreCache.baseUrl;
  }

  if (force) coreCache.attempts = [];

  if (CORE_BACKEND_URL) {
    const envCore = await testCandidates([CORE_BACKEND_URL], 'CORE_BACKEND_URL', 1300);
    if (envCore) {
      coreCache = { ...coreCache, baseUrl: envCore, source: 'CORE_BACKEND_URL', discoveredAt: Date.now(), lastError: null };
      return envCore;
    }
  }

  // Fast path for the common development setup: Admin and Core on the same PC.
  const localCore = await testCandidates([localCoreCandidate(CORE_HTTP_PORT)], 'LOCAL_LOOPBACK', 900);
  if (localCore) {
    coreCache = { ...coreCache, baseUrl: localCore, source: 'LOCAL_LOOPBACK', discoveredAt: Date.now(), lastError: null };
    return localCore;
  }

  // Most reliable when both machines already use the same MongoDB Atlas cluster.
  const registry = await discoverByAtlasRegistry();
  if (registry) {
    coreCache = { ...coreCache, baseUrl: registry, source: 'ATLAS_SERVICE_REGISTRY', discoveredAt: Date.now(), lastError: null };
    return registry;
  }

  const udp = await discoverByUdp();
  if (udp) {
    coreCache = { ...coreCache, baseUrl: udp, source: 'UDP_AUTO_DISCOVERY', discoveredAt: Date.now(), lastError: null };
    return udp;
  }

  const scan = await discoverByLanScan();
  if (scan) {
    coreCache = { ...coreCache, baseUrl: scan, source: 'LAN_SCAN_FALLBACK', discoveredAt: Date.now(), lastError: null };
    return scan;
  }

  coreCache.lastError = 'Không tìm thấy Core Backend. Hãy chắc chắn Backend 1.4.0 đang chạy và Windows Firewall cho phép TCP 5050 trong LocalSubnet.';
  coreCache.discoveredAt = Date.now();
  coreCache.baseUrl = null;
  coreCache.source = null;
  return null;
}

async function discoverCoreBackend(force = false) {
  if (!force && coreDiscoveryPromise) return coreDiscoveryPromise;

  const promise = resolveCoreBackend(force).finally(() => {
    if (coreDiscoveryPromise === promise) coreDiscoveryPromise = null;
  });

  coreDiscoveryPromise = promise;
  return promise;
}

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/core-connection', async (req, res) => {
  try {
    const force = String(req.query.refresh || '') === '1';
    const baseUrl = await discoverCoreBackend(force);

    if (!baseUrl) {
      return res.json({
        connected: false,
        message: coreCache.lastError || 'Không tìm thấy Core Backend.',
        discoveryPort: CORE_DISCOVERY_PORT,
        httpPort: CORE_HTTP_PORT,
        adminPort: PORT,
        attempts: coreCache.attempts,
        hint: `Kiểm tra http://127.0.0.1:${CORE_HTTP_PORT}/health và bảo đảm Admin API chạy port ${PORT}.`,
      });
    }

    return res.json({
      connected: true,
      baseUrl,
      source: coreCache.source,
      adminPort: PORT,
      discoveredAt: new Date(coreCache.discoveredAt).toISOString(),
      attempts: coreCache.attempts,
    });
  } catch (error) {
    coreCache.lastError = error?.message || String(error);
    return res.json({
      connected: false,
      message: `Core discovery lỗi: ${coreCache.lastError}`,
      discoveryPort: CORE_DISCOVERY_PORT,
      httpPort: CORE_HTTP_PORT,
      adminPort: PORT,
      attempts: coreCache.attempts,
      hint: `Mở trực tiếp http://127.0.0.1:${CORE_HTTP_PORT}/health để kiểm tra Core Backend.`,
    });
  }
});

app.use('/core-api', async (req, res) => {
  try {
    let baseUrl = await discoverCoreBackend(false);
    if (!baseUrl) baseUrl = await discoverCoreBackend(true);

    if (!baseUrl) {
      return res.status(503).json({
        message: 'Không tự tìm thấy Core Backend. Kiểm tra máy Backend, Firewall TCP 5050 / UDP 5051 hoặc CORE_BACKEND_URL.',
      });
    }

    const suffix = req.originalUrl.slice('/core-api'.length) || '/';
    const target = `${baseUrl}${suffix}`;

    const headers = {};
    for (const key of ['authorization', 'accept', 'content-type']) {
      if (req.headers[key]) headers[key] = req.headers[key];
    }

    const method = req.method.toUpperCase();
    const options = { method, headers };

    if (!['GET', 'HEAD'].includes(method)) {
      const contentType = String(req.headers['content-type'] || '');
      if (contentType.includes('application/json')) {
        options.body = JSON.stringify(req.body ?? {});
      } else if (req.body && Object.keys(req.body).length) {
        options.body = JSON.stringify(req.body);
        headers['content-type'] = 'application/json';
      }
    }

    let upstream;
    try {
      upstream = await fetchWithTimeout(target, options, 15000);
    } catch (_) {
      // Backend may have changed IP. Rediscover once and retry.
      baseUrl = await discoverCoreBackend(true);
      if (!baseUrl) {
        return res.status(503).json({
          message: 'Core Backend vừa mất kết nối và không thể tự tìm lại trong LAN.',
        });
      }
      upstream = await fetchWithTimeout(`${baseUrl}${suffix}`, options, 15000);
    }

    const type = upstream.headers.get('content-type');
    const disposition = upstream.headers.get('content-disposition');
    const cacheControl = upstream.headers.get('cache-control');

    if (type) res.setHeader('content-type', type);
    if (disposition) res.setHeader('content-disposition', disposition);
    if (cacheControl) res.setHeader('cache-control', cacheControl);

    res.status(upstream.status);
    const data = Buffer.from(await upstream.arrayBuffer());
    return res.send(data);
  } catch (error) {
    return res.status(502).json({
      message: `Lỗi proxy Core Backend: ${error.message}`,
    });
  }
});


function db() {
  if (!mongoose.connection.db) throw new Error('MongoDB chưa sẵn sàng');
  return mongoose.connection.db;
}

function publicId(doc) {
  if (doc?.id !== undefined && doc?.id !== null && String(doc.id).trim()) return String(doc.id);
  return String(doc?._id || '');
}

function serializeDoc(doc) {
  const out = { ...doc };
  out._id = String(doc._id);
  if (!out.id) out.id = String(doc._id);
  return out;
}

async function getArrayData(key) {
  const collection = db().collection(collectionMap[key]);
  const rows = await collection.find({}).sort({ createdAt: -1, _id: -1 }).toArray();
  return rows.map(serializeDoc);
}

async function syncArrayData(key, incoming) {
  if (!Array.isArray(incoming)) throw new Error('Dữ liệu gửi lên phải là một mảng');
  const collection = db().collection(collectionMap[key]);
  const existing = await collection.find({}).toArray();
  const existingByPublicId = new Map(existing.map(doc => [publicId(doc), doc]));
  const keep = new Set();
  const operations = [];

  for (const rowRaw of incoming) {
    const row = { ...rowRaw };
    const candidate = String(row.id || row._id || new mongoose.Types.ObjectId().toString());
    keep.add(candidate);

    const existingDoc = existingByPublicId.get(candidate);
    let filter;
    if (existingDoc) filter = { _id: existingDoc._id };
    else if (mongoose.Types.ObjectId.isValid(candidate) && candidate.length === 24) filter = { _id: new mongoose.Types.ObjectId(candidate) };
    else filter = { id: candidate };

    delete row._id;
    if (!row.id) row.id = candidate;

    operations.push({
      updateOne: {
        filter,
        update: { $set: row },
        upsert: true
      }
    });
  }

  for (const doc of existing) {
    if (!keep.has(publicId(doc))) operations.push({ deleteOne: { filter: { _id: doc._id } } });
  }

  if (operations.length) await collection.bulkWrite(operations, { ordered: false });
  return getArrayData(key);
}

async function getSettings() {
  const doc = await db().collection('settings').findOne({ _scope: 'th79_imove_admin' });
  if (!doc) return { ...defaultSettings };
  const { _id, _scope, ...settings } = doc;
  return { ...defaultSettings, ...settings };
}

async function saveSettings(settings) {
  const clean = { ...settings };
  delete clean._id;
  delete clean._scope;
  await db().collection('settings').updateOne(
    { _scope: 'th79_imove_admin' },
    { $set: clean, $setOnInsert: { _scope: 'th79_imove_admin' } },
    { upsert: true }
  );
  return getSettings();
}

// ============================================================
// INTERNAL ADMIN ACCOUNTS / RBAC
// Uses the same users collection + bcrypt passwordHash consumed
// by Core Backend /api/admin-auth/login. Granular role data lives
// in admin_roles and is attached to users through adminRoleCodes.
// ============================================================
const ADMIN_ALL_PERMISSIONS = [
  'dashboard.view',
  'users.view','users.update','users.block',
  'drivers.view','drivers.review','drivers.approve','drivers.suspend',
  'vehicles.view','vehicles.review',
  'bookings.view','bookings.cancel','bookings.adjust',
  'matching.view','matching.manage','matching.dispatch',
  'trust.view','trust.review','trust.manage',
  'pricing.view','pricing.create','pricing.activate','pricing.archive',
  'fees.view','fees.manage','promotions.view','promotions.manage',
  'broadcast.view','broadcast.send',
  'payments.view','payments.refund','wallets.view','wallets.adjust',
  'settlements.view','settlements.manage',
  'support.view','support.assign','support.reply','support.close',
  'settings.view','settings.manage','reports.view','audit.view',
  'admins.view','admins.manage','roles.manage'
];

const DEFAULT_ADMIN_ROLES = [
  ['SUPER_ADMIN','Quản trị tối cao',ADMIN_ALL_PERMISSIONS],
  ['OPERATIONS','Vận hành',['dashboard.view','users.view','users.update','drivers.view','drivers.review','drivers.approve','vehicles.view','vehicles.review','bookings.view','bookings.adjust','bookings.cancel','matching.view','matching.manage','matching.dispatch',
  'trust.view','trust.review','trust.manage','broadcast.view','broadcast.send','reports.view']],
  ['DRIVER_REVIEW','Duyệt tài xế',['dashboard.view','drivers.view','drivers.review','drivers.approve','drivers.suspend','vehicles.view','vehicles.review']],
  ['PRICING_MANAGER','Quản lý giá cước',['dashboard.view','pricing.view','pricing.create','pricing.activate','pricing.archive','fees.view','fees.manage','promotions.view','promotions.manage','audit.view']],
  ['FINANCE','Kế toán - tài chính',['dashboard.view','bookings.view','payments.view','payments.refund','wallets.view','wallets.adjust','settlements.view','settlements.manage','reports.view']],
  ['SUPPORT','Chăm sóc khách hàng',['dashboard.view','users.view','drivers.view','bookings.view','support.view','support.assign','support.reply','support.close']],
  ['VIEWER','Chỉ xem',['dashboard.view','users.view','drivers.view','bookings.view','pricing.view','fees.view','payments.view','reports.view','broadcast.view']]
];

async function ensureAdminRbacSeed(){
  const roles=db().collection('admin_roles');
  await roles.createIndex({code:1},{unique:true,name:'uq_admin_roles_code'}).catch(()=>{});
  const audit=db().collection('audit_logs');
  await audit.createIndex({actorType:1,createdAt:-1},{name:'idx_audit_actor_type_created'}).catch(()=>{});
  await audit.createIndex({actorId:1,createdAt:-1},{name:'idx_audit_actor_created'}).catch(()=>{});
  await audit.createIndex({action:1,createdAt:-1},{name:'idx_audit_action_created'}).catch(()=>{});
  for(const [code,name,permissions] of DEFAULT_ADMIN_ROLES){
    const setOnInsert={code,name,permissions,status:'ACTIVE',createdAt:new Date()};
    const update=code==='SUPER_ADMIN'
      ? {$set:{name,permissions:ADMIN_ALL_PERMISSIONS,status:'ACTIVE',updatedAt:new Date()},$setOnInsert:{code,createdAt:new Date()}}
      : {$setOnInsert:setOnInsert,$set:{updatedAt:new Date()}};
    await roles.updateOne({code},update,{upsert:true});
  }
  await roles.updateOne(
    {code:'OPERATIONS'},
    {$addToSet:{permissions:{$each:['matching.view','matching.manage','matching.dispatch','trust.view','trust.review']}},$set:{updatedAt:new Date()}},
  ).catch(()=>{});
}

function objectIdOrNull(value){
  const text=String(value||'');
  return mongoose.Types.ObjectId.isValid(text)?new mongoose.Types.ObjectId(text):null;
}

function adminRoleCodesOf(user){
  const preferred=Array.isArray(user?.adminRoleCodes)?user.adminRoleCodes:Array.isArray(user?.roleCodes)?user.roleCodes:[];
  const clean=[...new Set(preferred.map(x=>String(x||'').trim().toUpperCase()).filter(Boolean))];
  // Backward compatibility for the legacy ADMIN created by Backend V5.3.
  // Existing admin accounts had roles:['ADMIN'] but no granular role field.
  return clean.length?clean:['SUPER_ADMIN'];
}

function publicInternalAdmin(user){
  return {
    _id:String(user._id),id:String(user._id),
    fullName:user.fullName||'Quản trị viên',phone:user.phone||null,email:user.email||null,
    status:user.status||'ACTIVE',roleCodes:adminRoleCodesOf(user),
    lastLoginAt:user.lastLoginAt||null,createdAt:user.createdAt||null,updatedAt:user.updatedAt||null
  };
}

const adminTokenCache=new Map();
async function resolveAdminAccess(req){
  const header=String(req.headers.authorization||'');
  if(!header.startsWith('Bearer ')){const e=new Error('Thiếu Access Token quản trị.');e.status=401;throw e}
  const token=header.slice(7).trim();
  const cached=adminTokenCache.get(token);
  if(cached&&Date.now()-cached.at<30000)return cached.access;

  let baseUrl=await discoverCoreBackend(false);
  if(!baseUrl)baseUrl=await discoverCoreBackend(true);
  if(!baseUrl){const e=new Error('Không kết nối được Core Backend để xác thực phiên quản trị.');e.status=503;throw e}

  const upstream=await fetchWithTimeout(`${baseUrl}/api/admin-auth/me`,{headers:{Authorization:`Bearer ${token}`}},5000);
  const payload=await upstream.json().catch(()=>({}));
  if(!upstream.ok){const e=new Error(payload?.message||'Phiên quản trị không hợp lệ hoặc đã hết hạn.');e.status=upstream.status;throw e}
  const userId=objectIdOrNull(payload?.user?.id||payload?.user?._id);
  if(!userId){const e=new Error('Core Backend không trả ID tài khoản quản trị hợp lệ.');e.status=401;throw e}
  const user=await db().collection('users').findOne({_id:userId,roles:'ADMIN'});
  if(!user){const e=new Error('Không tìm thấy tài khoản ADMIN trong MongoDB.');e.status=403;throw e}
  const status=String(user.status||'ACTIVE').toUpperCase();
  if(['BLOCKED','DISABLED','DELETED','INACTIVE'].includes(status)){const e=new Error('Tài khoản quản trị đã bị khóa.');e.status=403;throw e}

  const roleCodes=adminRoleCodesOf(user);
  const roles=await db().collection('admin_roles').find({code:{$in:roleCodes},status:'ACTIVE'}).toArray();
  const permissions=roleCodes.includes('SUPER_ADMIN')
    ? [...ADMIN_ALL_PERMISSIONS]
    : [...new Set(roles.flatMap(r=>Array.isArray(r.permissions)?r.permissions:[]))];
  const roleNames=roleCodes.map(code=>roles.find(r=>r.code===code)?.name||code);
  const access={user:publicInternalAdmin(user),roleCodes,roleNames,permissions};
  adminTokenCache.set(token,{at:Date.now(),access});
  if(adminTokenCache.size>150){for(const [key,value] of adminTokenCache){if(Date.now()-value.at>60000)adminTokenCache.delete(key)}}
  return access;
}

function requireAdminAccess(permission){
  return async(req,res,next)=>{
    try{
      const access=await resolveAdminAccess(req);
      req.adminAccess=access;
      if(permission&&!access.permissions.includes(permission))return res.status(403).json({message:'Bạn không có quyền thực hiện thao tác này.'});
      next();
    }catch(error){res.status(error.status||500).json({message:error.message})}
  };
}

function requireAnyAdminAccess(permissions=[]){
  return async(req,res,next)=>{
    try{
      const access=await resolveAdminAccess(req);req.adminAccess=access;
      if(permissions.length&&!permissions.some(p=>access.permissions.includes(p)))return res.status(403).json({message:'Bạn không có quyền truy cập quản trị tài khoản.'});
      next();
    }catch(error){res.status(error.status||500).json({message:error.message})}
  };
}

async function validRoleCodes(codes){
  const clean=[...new Set((Array.isArray(codes)?codes:[]).map(x=>String(x||'').trim().toUpperCase()).filter(Boolean))];
  if(!clean.length)throw new Error('Phải chọn ít nhất một vai trò.');
  const count=await db().collection('admin_roles').countDocuments({code:{$in:clean},status:'ACTIVE'});
  if(count!==clean.length)throw new Error('Có vai trò không tồn tại hoặc đang tạm ngưng.');
  return clean;
}

function auditSafeSnapshot(value,depth=0){
  if(value===null||value===undefined)return value;
  if(depth>5)return '[TRUNCATED]';
  if(value instanceof Date)return value;
  if(Array.isArray(value))return value.slice(0,60).map(item=>auditSafeSnapshot(item,depth+1));
  if(typeof value!=='object')return value;
  const blocked=/password|passwordHash|token|secret|refresh|authorization|cookie|otp/i;
  const out={};
  for(const [key,item] of Object.entries(value)){
    if(blocked.test(key))continue;
    out[key]=auditSafeSnapshot(item,depth+1);
  }
  return out;
}

async function auditAdmin(req,action,entityType,entityId,before=null,after=null){
  try{
    await db().collection('audit_logs').insertOne({
      actorType:'ADMIN',actorId:objectIdOrNull(req.adminAccess?.user?.id),
      actorName:req.adminAccess?.user?.fullName||null,actorPhone:req.adminAccess?.user?.phone||null,actorEmail:req.adminAccess?.user?.email||null,
      actorRoleCodes:Array.isArray(req.adminAccess?.roleCodes)?req.adminAccess.roleCodes:[],
      action,entityType,entityId:objectIdOrNull(entityId)||String(entityId||''),
      before:auditSafeSnapshot(before),after:auditSafeSnapshot(after),
      ip:String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].trim()||null,
      userAgent:String(req.headers['user-agent']||'').slice(0,500)||null,createdAt:new Date()
    });
  }catch(_){/* audit must not break the requested operation */}
}

app.get('/api/admin-access/me',requireAdminAccess(),async(req,res)=>res.json(req.adminAccess));

// Read-only audit history for internal admin accounts.
app.get('/api/admin-audit',requireAdminAccess('audit.view'),async(req,res)=>{
  try{
    const limit=Math.min(500,Math.max(1,Number(req.query.limit||250)));
    const filter={actorType:'ADMIN'};
    const action=String(req.query.action||'').trim();
    const actorId=objectIdOrNull(req.query.actorId);
    const from=String(req.query.from||'').trim();
    const to=String(req.query.to||'').trim();
    if(action)filter.action=action;
    if(actorId)filter.actorId=actorId;
    if(from||to){
      filter.createdAt={};
      if(from){const d=new Date(`${from}T00:00:00`);if(!Number.isNaN(d.getTime()))filter.createdAt.$gte=d}
      if(to){const d=new Date(`${to}T23:59:59.999`);if(!Number.isNaN(d.getTime()))filter.createdAt.$lte=d}
      if(!Object.keys(filter.createdAt).length)delete filter.createdAt;
    }

    let logs=await db().collection('audit_logs').find(filter).sort({createdAt:-1}).limit(limit).toArray();
    const actorIds=[...new Set(logs.map(x=>x.actorId).filter(Boolean).map(String))].map(objectIdOrNull).filter(Boolean);
    const actors=actorIds.length?await db().collection('users').find({_id:{$in:actorIds},roles:'ADMIN'}).project({fullName:1,phone:1,email:1,status:1}).toArray():[];
    const actorMap=new Map(actors.map(a=>[String(a._id),a]));
    const q=String(req.query.q||'').trim().toLowerCase();
    const rows=logs.map(log=>{
      const actor=actorMap.get(String(log.actorId||''));
      return {
        ...serializeDoc(log),
        actor:actor?{id:String(actor._id),fullName:actor.fullName||log.actorName||'Quản trị viên',phone:actor.phone||log.actorPhone||null,email:actor.email||log.actorEmail||null,status:actor.status||'ACTIVE'}:{id:log.actorId?String(log.actorId):null,fullName:log.actorName||'Tài khoản cũ/không xác định',phone:log.actorPhone||null,email:log.actorEmail||null,status:null}
      };
    }).filter(row=>{
      if(!q)return true;
      const text=[row.action,row.entityType,row.entityId,row.ip,row.actor?.fullName,row.actor?.phone,row.actor?.email,JSON.stringify(row.before||{}),JSON.stringify(row.after||{})].join(' ').toLowerCase();
      return text.includes(q);
    });
    const actorList=await db().collection('users').find({roles:'ADMIN'}).project({fullName:1,phone:1,email:1,status:1}).sort({fullName:1}).toArray();
    res.json({logs:rows,actors:actorList.map(a=>({id:String(a._id),fullName:a.fullName||'Quản trị viên',phone:a.phone||null,email:a.email||null,status:a.status||'ACTIVE'}))});
  }catch(error){res.status(500).json({message:error.message})}
});

// ============================================================
// CURRENT ADMIN PROFILE
// Self-service profile editing. Roles/status remain admin-managed.
// Password change always verifies the current password first.
// ============================================================
app.get('/api/admin-profile',requireAdminAccess(),async(req,res)=>{
  try{
    const id=objectIdOrNull(req.adminAccess?.user?.id);
    if(!id)return res.status(401).json({message:'Không xác định được tài khoản đang đăng nhập.'});
    const user=await db().collection('users').findOne({_id:id,roles:'ADMIN'});
    if(!user)return res.status(404).json({message:'Không tìm thấy tài khoản quản trị.'});
    res.json({user:publicInternalAdmin(user)});
  }catch(error){res.status(400).json({message:error.message})}
});

app.patch('/api/admin-profile',requireAdminAccess(),async(req,res)=>{
  try{
    const id=objectIdOrNull(req.adminAccess?.user?.id);
    if(!id)return res.status(401).json({message:'Không xác định được tài khoản đang đăng nhập.'});
    const users=db().collection('users');
    const existing=await users.findOne({_id:id,roles:'ADMIN'});
    if(!existing)return res.status(404).json({message:'Không tìm thấy tài khoản quản trị.'});

    const fullName=String(req.body?.fullName||'').trim();
    const phone=String(req.body?.phone||'').trim();
    const email=String(req.body?.email||'').trim().toLowerCase();
    if(!fullName||!phone||!email)return res.status(400).json({message:'Vui lòng nhập đầy đủ họ tên, số điện thoại và email.'});

    const duplicate=await users.findOne({_id:{$ne:id},$or:[{phone},{email}]});
    if(duplicate)return res.status(409).json({message:'Số điện thoại hoặc email đã được sử dụng bởi tài khoản khác.'});

    const now=new Date();
    const result=await users.findOneAndUpdate(
      {_id:id,roles:'ADMIN'},
      {$set:{fullName,phone,email,updatedAt:now}},
      {returnDocument:'after'}
    );
    adminTokenCache.clear();
    await auditAdmin(req,'ADMIN_PROFILE_UPDATE','ADMIN_USER',id,publicInternalAdmin(existing),publicInternalAdmin(result));
    res.json({success:true,user:publicInternalAdmin(result)});
  }catch(error){res.status(400).json({message:error.message})}
});

app.post('/api/admin-profile/password',requireAdminAccess(),async(req,res)=>{
  try{
    const id=objectIdOrNull(req.adminAccess?.user?.id);
    if(!id)return res.status(401).json({message:'Không xác định được tài khoản đang đăng nhập.'});
    const currentPassword=String(req.body?.currentPassword||'');
    const newPassword=String(req.body?.newPassword||'');
    if(!currentPassword)return res.status(400).json({message:'Vui lòng nhập mật khẩu hiện tại.'});
    if(newPassword.length<8)return res.status(400).json({message:'Mật khẩu mới phải có ít nhất 8 ký tự.'});
    if(currentPassword===newPassword)return res.status(400).json({message:'Mật khẩu mới phải khác mật khẩu hiện tại.'});

    const users=db().collection('users');
    const existing=await users.findOne({_id:id,roles:'ADMIN'});
    if(!existing||!existing.passwordHash)return res.status(404).json({message:'Tài khoản chưa có mật khẩu hợp lệ.'});

    const passwordOk=await bcrypt.compare(currentPassword,existing.passwordHash);
    if(!passwordOk)return res.status(401).json({message:'Mật khẩu hiện tại không đúng.'});

    const passwordHash=await bcrypt.hash(newPassword,12);
    const now=new Date();
    await users.updateOne({_id:id,roles:'ADMIN'},{$set:{passwordHash,mustChangePassword:false,failedLoginCount:0,updatedAt:now}});
    adminTokenCache.clear();
    await db().collection('auth_sessions').updateMany(
      {userId:id,revokedAt:{$exists:false}},
      {$set:{revokedAt:now,revokeReason:'SELF_PASSWORD_CHANGE',updatedAt:now}}
    ).catch(()=>{});
    await auditAdmin(req,'ADMIN_SELF_PASSWORD_CHANGE','ADMIN_USER',id,null,{passwordChangedAt:now});
    res.json({success:true});
  }catch(error){res.status(400).json({message:error.message})}
});

app.get('/api/admin-management/bootstrap',requireAnyAdminAccess(['admins.view','admins.manage','roles.manage']),async(req,res)=>{
  try{
    const [accounts,roles]=await Promise.all([
      req.adminAccess.permissions.includes('admins.view')?db().collection('users').find({roles:'ADMIN'}).sort({createdAt:1,_id:1}).toArray():[],
      db().collection('admin_roles').find({}).sort({code:1}).toArray()
    ]);
    res.json({accounts:accounts.map(publicInternalAdmin),roles:roles.map(r=>({...r,_id:String(r._id)})),permissions:ADMIN_ALL_PERMISSIONS});
  }catch(error){res.status(500).json({message:error.message})}
});

app.post('/api/admin-management/accounts',requireAdminAccess('admins.manage'),async(req,res)=>{
  try{
    const fullName=String(req.body?.fullName||'').trim(),phone=String(req.body?.phone||'').trim(),email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'');
    if(!fullName||!phone||!email)return res.status(400).json({message:'Vui lòng nhập họ tên, số điện thoại và email.'});
    if(password.length<8)return res.status(400).json({message:'Mật khẩu phải có ít nhất 8 ký tự.'});
    const roleCodes=await validRoleCodes(req.body?.roleCodes);
    const status=String(req.body?.status||'ACTIVE').toUpperCase()==='BLOCKED'?'BLOCKED':'ACTIVE';
    const users=db().collection('users');
    const duplicate=await users.findOne({$or:[{phone},{email}]});
    if(duplicate)return res.status(409).json({message:'Số điện thoại hoặc email đã được sử dụng bởi tài khoản khác.'});
    const now=new Date(),passwordHash=await bcrypt.hash(password,12);
    const doc={fullName,phone,email,passwordHash,roles:['ADMIN'],adminRoleCodes:roleCodes,roleCodes,status,mustChangePassword:false,failedLoginCount:0,lastLoginAt:null,createdAt:now,updatedAt:now};
    const result=await users.insertOne(doc);const created={...doc,_id:result.insertedId};
    await auditAdmin(req,'ADMIN_ACCOUNT_CREATE','ADMIN_USER',result.insertedId,null,publicInternalAdmin(created));
    res.status(201).json(publicInternalAdmin(created));
  }catch(error){res.status(400).json({message:error.message})}
});

app.patch('/api/admin-management/accounts/:id',requireAdminAccess('admins.manage'),async(req,res)=>{
  try{
    const id=objectIdOrNull(req.params.id);if(!id)return res.status(400).json({message:'ID tài khoản không hợp lệ.'});
    const users=db().collection('users'),existing=await users.findOne({_id:id,roles:'ADMIN'});if(!existing)return res.status(404).json({message:'Không tìm thấy tài khoản ADMIN.'});
    const update={updatedAt:new Date()};
    if('fullName'in req.body){const v=String(req.body.fullName||'').trim();if(!v)return res.status(400).json({message:'Họ tên không được để trống.'});update.fullName=v}
    if('phone'in req.body){const v=String(req.body.phone||'').trim();if(!v)return res.status(400).json({message:'Số điện thoại không được để trống.'});if(await users.findOne({_id:{$ne:id},phone:v}))return res.status(409).json({message:'Số điện thoại đã được sử dụng.'});update.phone=v}
    if('email'in req.body){const v=String(req.body.email||'').trim().toLowerCase();if(!v)return res.status(400).json({message:'Email không được để trống.'});if(await users.findOne({_id:{$ne:id},email:v}))return res.status(409).json({message:'Email đã được sử dụng.'});update.email=v}
    if('roleCodes'in req.body){const codes=await validRoleCodes(req.body.roleCodes);if(String(req.adminAccess.user.id)===String(id)&&!codes.includes('SUPER_ADMIN')&&adminRoleCodesOf(existing).includes('SUPER_ADMIN'))return res.status(409).json({message:'Bạn không thể tự gỡ quyền SUPER_ADMIN của chính mình.'});update.adminRoleCodes=codes;update.roleCodes=codes}
    if('status'in req.body){const v=String(req.body.status||'').toUpperCase()==='BLOCKED'?'BLOCKED':'ACTIVE';if(String(req.adminAccess.user.id)===String(id)&&v!=='ACTIVE')return res.status(409).json({message:'Bạn không thể tự khóa tài khoản đang đăng nhập.'});update.status=v}
    const result=await users.findOneAndUpdate({_id:id,roles:'ADMIN'},{$set:update},{returnDocument:'after'});adminTokenCache.clear();
    await auditAdmin(req,'ADMIN_ACCOUNT_UPDATE','ADMIN_USER',id,publicInternalAdmin(existing),publicInternalAdmin(result));
    res.json(publicInternalAdmin(result));
  }catch(error){res.status(400).json({message:error.message})}
});

app.post('/api/admin-management/accounts/:id/reset-password',requireAdminAccess('admins.manage'),async(req,res)=>{
  try{
    const id=objectIdOrNull(req.params.id);if(!id)return res.status(400).json({message:'ID tài khoản không hợp lệ.'});const password=String(req.body?.password||'');if(password.length<8)return res.status(400).json({message:'Mật khẩu phải có ít nhất 8 ký tự.'});
    const passwordHash=await bcrypt.hash(password,12),now=new Date();const result=await db().collection('users').updateOne({_id:id,roles:'ADMIN'},{$set:{passwordHash,mustChangePassword:false,failedLoginCount:0,updatedAt:now}});if(!result.matchedCount)return res.status(404).json({message:'Không tìm thấy tài khoản ADMIN.'});
    if(db().collection('auth_sessions'))await db().collection('auth_sessions').updateMany({userId:id,revokedAt:{$exists:false}},{$set:{revokedAt:now,revokeReason:'ADMIN_PASSWORD_RESET',updatedAt:now}}).catch(()=>{});
    adminTokenCache.clear();await auditAdmin(req,'ADMIN_PASSWORD_RESET','ADMIN_USER',id,null,{passwordResetAt:now});res.json({success:true});
  }catch(error){res.status(400).json({message:error.message})}
});

app.delete('/api/admin-management/accounts/:id',requireAdminAccess('admins.manage'),async(req,res)=>{
  try{
    const id=objectIdOrNull(req.params.id);if(!id)return res.status(400).json({message:'ID tài khoản không hợp lệ.'});if(String(req.adminAccess.user.id)===String(id))return res.status(409).json({message:'Bạn không thể xóa tài khoản đang đăng nhập.'});
    const users=db().collection('users'),existing=await users.findOne({_id:id,roles:'ADMIN'});if(!existing)return res.status(404).json({message:'Không tìm thấy tài khoản ADMIN.'});
    if(adminRoleCodesOf(existing).includes('SUPER_ADMIN')){const admins=await users.find({roles:'ADMIN',status:'ACTIVE'}).toArray();const superCount=admins.filter(a=>adminRoleCodesOf(a).includes('SUPER_ADMIN')).length;if(superCount<=1)return res.status(409).json({message:'Không thể xóa SUPER_ADMIN cuối cùng của hệ thống.'})}
    await users.deleteOne({_id:id,roles:'ADMIN'});await db().collection('auth_sessions').updateMany({userId:id,revokedAt:{$exists:false}},{$set:{revokedAt:new Date(),revokeReason:'ADMIN_ACCOUNT_DELETED',updatedAt:new Date()}}).catch(()=>{});adminTokenCache.clear();
    await auditAdmin(req,'ADMIN_ACCOUNT_DELETE','ADMIN_USER',id,publicInternalAdmin(existing),null);res.json({success:true});
  }catch(error){res.status(400).json({message:error.message})}
});

app.post('/api/admin-management/roles',requireAdminAccess('roles.manage'),async(req,res)=>{
  try{
    const code=String(req.body?.code||'').trim().toUpperCase().replace(/[^A-Z0-9_]/g,'_'),name=String(req.body?.name||'').trim();if(!code||!name)return res.status(400).json({message:'Thiếu mã hoặc tên vai trò.'});if(code==='SUPER_ADMIN')return res.status(409).json({message:'SUPER_ADMIN là vai trò hệ thống.'});
    const permissions=[...new Set((Array.isArray(req.body?.permissions)?req.body.permissions:[]).filter(p=>ADMIN_ALL_PERMISSIONS.includes(p)))],status=String(req.body?.status||'ACTIVE').toUpperCase()==='INACTIVE'?'INACTIVE':'ACTIVE';
    const col=db().collection('admin_roles');if(await col.findOne({code}))return res.status(409).json({message:'Mã vai trò đã tồn tại.'});const now=new Date(),doc={code,name,permissions,status,createdAt:now,updatedAt:now};const result=await col.insertOne(doc);adminTokenCache.clear();await auditAdmin(req,'ADMIN_ROLE_CREATE','ADMIN_ROLE',result.insertedId,null,doc);res.status(201).json({...doc,_id:String(result.insertedId)});
  }catch(error){res.status(400).json({message:error.message})}
});

app.patch('/api/admin-management/roles/:id',requireAdminAccess('roles.manage'),async(req,res)=>{
  try{
    const id=objectIdOrNull(req.params.id);if(!id)return res.status(400).json({message:'ID vai trò không hợp lệ.'});const col=db().collection('admin_roles'),existing=await col.findOne({_id:id});if(!existing)return res.status(404).json({message:'Không tìm thấy vai trò.'});
    const update={updatedAt:new Date()};if('name'in req.body){const name=String(req.body.name||'').trim();if(!name)return res.status(400).json({message:'Tên vai trò không được để trống.'});update.name=name}
    if(existing.code==='SUPER_ADMIN'){update.status='ACTIVE';update.permissions=[...ADMIN_ALL_PERMISSIONS]}
    else{if('status'in req.body)update.status=String(req.body.status||'').toUpperCase()==='INACTIVE'?'INACTIVE':'ACTIVE';if('permissions'in req.body)update.permissions=[...new Set((Array.isArray(req.body.permissions)?req.body.permissions:[]).filter(p=>ADMIN_ALL_PERMISSIONS.includes(p)))]}
    const result=await col.findOneAndUpdate({_id:id},{$set:update},{returnDocument:'after'});adminTokenCache.clear();await auditAdmin(req,'ADMIN_ROLE_UPDATE','ADMIN_ROLE',id,existing,result);res.json({...result,_id:String(result._id)});
  }catch(error){res.status(400).json({message:error.message})}
});

app.delete('/api/admin-management/roles/:id',requireAdminAccess('roles.manage'),async(req,res)=>{
  try{
    const id=objectIdOrNull(req.params.id);if(!id)return res.status(400).json({message:'ID vai trò không hợp lệ.'});const col=db().collection('admin_roles'),role=await col.findOne({_id:id});if(!role)return res.status(404).json({message:'Không tìm thấy vai trò.'});if(role.code==='SUPER_ADMIN')return res.status(409).json({message:'Không thể xóa vai trò SUPER_ADMIN.'});
    const assigned=await db().collection('users').countDocuments({roles:'ADMIN',$or:[{adminRoleCodes:role.code},{roleCodes:role.code}]});if(assigned)return res.status(409).json({message:`Vai trò đang được gán cho ${assigned} tài khoản. Hãy đổi vai trò tài khoản trước khi xóa.`});
    await col.deleteOne({_id:id});adminTokenCache.clear();await auditAdmin(req,'ADMIN_ROLE_DELETE','ADMIN_ROLE',id,role,null);res.json({success:true});
  }catch(error){res.status(400).json({message:error.message})}
});

app.get('/api/health', async (_req, res) => {
  try {
    await db().command({ ping: 1 });
    const counts = {};
    for (const key of allowedArrayKeys) counts[key] = await db().collection(collectionMap[key]).countDocuments();
    res.json({ success: true, service: 'TH79_IMOVE_ADMIN_GATEWAY', version: '1.5.1', adminPort: PORT, coreBackendUrl: CORE_BACKEND_URL, coreHttpPort: CORE_HTTP_PORT, database: DB_NAME, state: mongoose.connection.readyState, counts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/bootstrap', async (_req, res) => {
  try {
    const [customers, drivers, trips, payments, revenue, settings] = await Promise.all([
      getArrayData('customers'),
      getArrayData('drivers'),
      getArrayData('trips'),
      getArrayData('payments'),
      getArrayData('revenue'),
      getSettings()
    ]);
    res.json({ customers, drivers, trips, payments, revenue, settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/data/settings', async (_req, res) => {
  try { res.json(await getSettings()); }
  catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/data/settings', requireAdminAccess('settings.manage'), async (req, res) => {
  try {
    const before=await getSettings();
    const after=await saveSettings(req.body || {});
    await auditAdmin(req,'SETTINGS_UPDATE','SETTINGS','th79_imove_admin',before,after);
    res.json(after);
  }
  catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/data/:key', async (req, res) => {
  try {
    const { key } = req.params;
    if (!allowedArrayKeys.has(key)) return res.status(404).json({ message: 'Collection không được hỗ trợ' });
    res.json(await getArrayData(key));
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/data/:key', requireAdminAccess(), async (req, res) => {
  try {
    const { key } = req.params;
    if (!allowedArrayKeys.has(key)) return res.status(404).json({ message: 'Collection không được hỗ trợ' });
    const beforeCount=await db().collection(collectionMap[key]).countDocuments();
    const result=await syncArrayData(key, req.body);
    await auditAdmin(req,'ADMIN_DATA_SYNC','ADMIN_DATA',key,{collection:key,count:beforeCount},{collection:key,count:Array.isArray(result)?result.length:0});
    res.json(result);
  } catch (error) { res.status(500).json({ message: error.message }); }
});



// ============================================================
// USERS / CUSTOMERS
// Admin customer page reads users and only mutates CUSTOMER accounts.
// ============================================================
const USER_STATUSES = new Set(['ACTIVE','INACTIVE','BLOCKED','DELETED']);
app.patch('/api/users/:id', requireAdminAccess('users.update'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) return res.status(400).json({ message: 'ID người dùng MongoDB không hợp lệ' });
    const id = new mongoose.Types.ObjectId(String(req.params.id));
    const existing = await db().collection('users').findOne({ _id: id, roles: 'CUSTOMER' });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy tài khoản CUSTOMER' });
    const update = { updatedAt: new Date() };
    if ('fullName' in req.body) {
      const fullName = String(req.body.fullName || '').trim();
      if (!fullName) return res.status(400).json({ message: 'Họ và tên không được để trống' });
      update.fullName = fullName;
    }
    if ('phone' in req.body) {
      const phone = String(req.body.phone || '').trim();
      if (!phone) return res.status(400).json({ message: 'Số điện thoại không được để trống' });
      const duplicate = await db().collection('users').findOne({ phone, _id: { $ne: id } });
      if (duplicate) return res.status(409).json({ message: 'Số điện thoại đã được sử dụng' });
      update.phone = phone;
    }
    if ('email' in req.body) update.email = req.body.email == null || String(req.body.email).trim() === '' ? null : String(req.body.email).trim();
    if ('status' in req.body) {
      const status = String(req.body.status || '').trim().toUpperCase();
      if (!USER_STATUSES.has(status)) return res.status(400).json({ message: 'Trạng thái người dùng không hợp lệ' });
      update.status = status;
    }
    const result = await db().collection('users').findOneAndUpdate({ _id: id, roles: 'CUSTOMER' }, { $set: update }, { returnDocument: 'after' });
    await auditAdmin(req,'CUSTOMER_UPDATE','CUSTOMER',id,serializeDoc(existing),serializeDoc(result));
    res.json(serializeDoc(result));
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/users/:id', requireAdminAccess('users.block'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) return res.status(400).json({ message: 'ID người dùng MongoDB không hợp lệ' });
    const id = new mongoose.Types.ObjectId(String(req.params.id));
    const existing = await db().collection('users').findOne({ _id: id, roles: 'CUSTOMER' });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy tài khoản CUSTOMER' });
    const bookingCount = await db().collection(collectionMap.trips).countDocuments({ customerId: id });
    if (bookingCount > 0) return res.status(409).json({ message: `Khách hàng đã có ${bookingCount} chuyến xe. Hãy khóa tài khoản thay vì xóa để giữ lịch sử.` });
    const result = await db().collection('users').deleteOne({ _id: id, roles: 'CUSTOMER' });
    if (!result.deletedCount) return res.status(404).json({ message: 'Không tìm thấy tài khoản CUSTOMER' });
    await auditAdmin(req,'CUSTOMER_DELETE','CUSTOMER',id,serializeDoc(existing),null);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ============================================================
// BOOKINGS / TRIPS
// MongoDB schema uses bookings with uppercase workflow statuses.
// This endpoint updates only the booking status and avoids syncing
// UI-shaped trip rows back over the booking document.
// ============================================================
const BOOKING_STATUSES = new Set([
  'DRAFT','SEARCHING','DRIVER_ASSIGNED','DRIVER_ARRIVING','DRIVER_ARRIVED',
  'IN_PROGRESS','COMPLETED','CANCELLED','CANCELLED_BY_USER',
  'CANCELLED_BY_DRIVER','EXPIRED'
]);

app.patch('/api/bookings/:id/status', requireAdminAccess('bookings.adjust'), async (req, res) => {
  try {
    const status = String(req.body?.status || '').trim().toUpperCase();
    if (!BOOKING_STATUSES.has(status)) return res.status(400).json({ message: 'Trạng thái chuyến không hợp lệ' });
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) return res.status(400).json({ message: 'ID booking MongoDB không hợp lệ' });
    const id = new mongoose.Types.ObjectId(String(req.params.id));
    const existing = await db().collection(collectionMap.trips).findOne({ _id: id });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy chuyến xe' });
    const result = await db().collection(collectionMap.trips).findOneAndUpdate(
      { _id: id },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ message: 'Không tìm thấy chuyến xe' });
    await auditAdmin(req,'BOOKING_STATUS_UPDATE','BOOKING',id,{id:String(existing._id),bookingCode:existing.bookingCode||existing.code||null,status:existing.status},{id:String(result._id),bookingCode:result.bookingCode||result.code||null,status:result.status});
    res.json(serializeDoc(result));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// PRICING / FARE ENGINE
// SOURCE OF TRUTH: MongoDB only. No hard-coded fare values.
// ============================================================
function asNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'bigint') return Number(value);
  const parsed = Number(typeof value === 'object' && value?.toString ? value.toString() : value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function nullableNumber(value) { return value === null || value === undefined || value === '' ? null : asNumber(value); }
function asInt(value) { return new mongoose.mongo.Int32(Math.trunc(asNumber(value))); }
function normalizeCode(value) { return String(value || '').trim().toUpperCase(); }
function requireField(body, key, label = key) {
  if (body?.[key] === undefined || body?.[key] === null || String(body[key]).trim() === '') throw new Error(`Thiếu ${label}`);
}
function pricingDoc(doc) {
  if (!doc) return null;
  const out = serializeDoc(doc);
  for (const key of ['version','baseFare','baseDistanceKm','minimumFare','pricePerMinute','roundingUnit','bookingFee','customerServiceFee','driverFixedFee','paymentFeePercent']) {
    if (key in out && out[key] !== null) out[key] = asNumber(out[key]);
  }
  if (Array.isArray(out.distanceTiers)) out.distanceTiers = out.distanceTiers.map(t => ({ ...t, fromKm: asNumber(t.fromKm), toKm: t.toKm == null ? null : asNumber(t.toKm), pricePerKm: asNumber(t.pricePerKm) }));
  if (out.driverCommission) out.driverCommission = { ...out.driverCommission, value: asNumber(out.driverCommission.value) };
  if ('value' in out) out.value = asNumber(out.value);
  return out;
}
function objectIdFilter(id) {
  if (!mongoose.Types.ObjectId.isValid(String(id))) throw new Error('ID MongoDB không hợp lệ');
  return { _id: new mongoose.Types.ObjectId(String(id)) };
}
async function nextVersion(collectionName, serviceCode, areaCode) {
  const last = await db().collection(collectionName).find({ serviceCode, areaCode }).sort({ version: -1 }).limit(1).toArray();
  return last.length ? asNumber(last[0].version) + 1 : 1;
}
async function archiveOtherActive(collectionName, serviceCode, areaCode, exceptId = null) {
  const filter = { serviceCode, areaCode, status: 'ACTIVE' };
  if (exceptId) filter._id = { $ne: exceptId };
  await db().collection(collectionName).updateMany(filter, { $set: { status: 'ARCHIVED', updatedAt: new Date() } });
}
async function ensurePricingScope({ serviceCode, serviceName, areaCode, areaName }) {
  const service = normalizeCode(serviceCode), area = normalizeCode(areaCode), now = new Date();
  if (!service) throw new Error('Thiếu serviceCode');
  if (!area) throw new Error('Thiếu areaCode');
  const services = db().collection('services'), areas = db().collection('service_areas');
  if (!(await services.findOne({ code: service }))) {
    await services.insertOne({ code: service, name: String(serviceName || service).trim() || service, description: null, iconKey: null, status: 'ACTIVE', createdAt: now, updatedAt: now });
  }
  const existingArea = await areas.findOne({ code: area });
  if (!existingArea) {
    await areas.insertOne({ code: area, name: String(areaName || area).trim() || area, provinceCode: null, center: null, boundary: null, enabledServices: [service], status: 'ACTIVE', createdAt: now, updatedAt: now });
  } else {
    await areas.updateOne({ _id: existingArea._id }, { $addToSet: { enabledServices: service }, $set: { updatedAt: now } });
  }
}
async function findActiveConfig(collectionName, serviceCode, areaCode) {
  const now = new Date();
  const base = { serviceCode, status: 'ACTIVE', $and: [
    { $or: [{ effectiveFrom: null }, { effectiveFrom: { $exists: false } }, { effectiveFrom: { $lte: now } }] },
    { $or: [{ effectiveTo: null }, { effectiveTo: { $exists: false } }, { effectiveTo: { $gte: now } }] }
  ]};
  let doc = await db().collection(collectionName).findOne({ ...base, areaCode }, { sort: { version: -1, effectiveFrom: -1 } });
  if (!doc && areaCode !== 'GLOBAL') doc = await db().collection(collectionName).findOne({ ...base, areaCode: 'GLOBAL' }, { sort: { version: -1, effectiveFrom: -1 } });
  return doc;
}

app.get('/api/pricing/bootstrap', async (_req, res) => {
  try {
    const [services, areas, fares, fees, surcharges] = await Promise.all([
      db().collection('services').find({}).sort({ sortOrder: 1, code: 1 }).toArray(),
      db().collection('service_areas').find({}).sort({ code: 1 }).toArray(),
      db().collection('fare_configs').find({}).sort({ serviceCode: 1, areaCode: 1, version: -1 }).toArray(),
      db().collection('platform_fees').find({}).sort({ serviceCode: 1, areaCode: 1, version: -1 }).toArray(),
      db().collection('surcharges').find({}).sort({ serviceCode: 1, code: 1 }).toArray()
    ]);
    res.json({ services: services.map(serializeDoc), areas: areas.map(serializeDoc), fares: fares.map(pricingDoc), fees: fees.map(pricingDoc), surcharges: surcharges.map(pricingDoc) });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/pricing/fare', requireAdminAccess('pricing.create'), async (req, res) => {
  try {
    for (const [k,l] of [['serviceCode','mã dịch vụ'],['areaCode','mã khu vực'],['baseFare','giá mở cửa'],['baseDistanceKm','km cơ bản'],['minimumFare','giá tối thiểu'],['pricePerMinute','giá/phút'],['roundingUnit','đơn vị làm tròn']]) requireField(req.body,k,l);
    const serviceCode = normalizeCode(req.body.serviceCode), areaCode = normalizeCode(req.body.areaCode);
    const status = ['DRAFT','ACTIVE'].includes(req.body.status) ? req.body.status : 'DRAFT';
    const roundingUnit = asNumber(req.body.roundingUnit); if (roundingUnit <= 0) return res.status(400).json({ message: 'Đơn vị làm tròn phải lớn hơn 0' });
    await ensurePricingScope({ serviceCode, serviceName: req.body.serviceName, areaCode, areaName: req.body.areaName });
    const version = await nextVersion('fare_configs', serviceCode, areaCode); if (status === 'ACTIVE') await archiveOtherActive('fare_configs', serviceCode, areaCode);
    const now = new Date();
    const doc = { serviceCode, areaCode, version: asInt(version), status, currency: 'VND', baseFare: asNumber(req.body.baseFare), baseDistanceKm: asNumber(req.body.baseDistanceKm), minimumFare: asNumber(req.body.minimumFare), pricePerMinute: asNumber(req.body.pricePerMinute), roundingUnit: asInt(roundingUnit),
      distanceTiers: Array.isArray(req.body.distanceTiers) ? req.body.distanceTiers.map(t => ({ fromKm: asNumber(t.fromKm), toKm: t.toKm == null || t.toKm === '' ? null : asNumber(t.toKm), pricePerKm: asNumber(t.pricePerKm) })) : [],
      effectiveFrom: status === 'ACTIVE' ? now : null, effectiveTo: null, note: req.body.note || null, createdBy: null, approvedBy: null, createdAt: now, updatedAt: now };
    const result = await db().collection('fare_configs').insertOne(doc);
    const created=pricingDoc({ ...doc, _id: result.insertedId });
    await auditAdmin(req,'FARE_CREATE','FARE_CONFIG',result.insertedId,null,created);
    res.status(201).json(created);
  } catch (error) { res.status(400).json({ message: error.message }); }
});
app.put('/api/pricing/fare/:id', requireAdminAccess('pricing.create'), async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id), col = db().collection('fare_configs'), existing = await col.findOne({ _id: id });
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy bảng giá' });
    for (const [k,l] of [['baseFare','giá mở cửa'],['baseDistanceKm','km cơ bản'],['minimumFare','giá tối thiểu'],['pricePerMinute','giá/phút'],['roundingUnit','đơn vị làm tròn']]) requireField(req.body,k,l);
    const status = ['DRAFT','ACTIVE','ARCHIVED'].includes(req.body.status) ? req.body.status : existing.status;
    const roundingUnit = asNumber(req.body.roundingUnit); if (roundingUnit <= 0) return res.status(400).json({ message: 'Đơn vị làm tròn phải lớn hơn 0' });
    if (status === 'ACTIVE') await archiveOtherActive('fare_configs', existing.serviceCode, existing.areaCode, id);
    const clean = { status, baseFare: asNumber(req.body.baseFare), baseDistanceKm: asNumber(req.body.baseDistanceKm), minimumFare: asNumber(req.body.minimumFare), pricePerMinute: asNumber(req.body.pricePerMinute), roundingUnit: asInt(roundingUnit),
      distanceTiers: Array.isArray(req.body.distanceTiers) ? req.body.distanceTiers.map(t => ({ fromKm: asNumber(t.fromKm), toKm: t.toKm == null || t.toKm === '' ? null : asNumber(t.toKm), pricePerKm: asNumber(t.pricePerKm) })) : [], note: req.body.note || null, updatedAt: new Date() };
    if (status === 'ACTIVE' && !existing.effectiveFrom) clean.effectiveFrom = new Date();
    const result = await col.findOneAndUpdate({ _id: id }, { $set: clean }, { returnDocument: 'after' });
    await auditAdmin(req,'FARE_UPDATE','FARE_CONFIG',id,pricingDoc(existing),pricingDoc(result));
    res.json(pricingDoc(result));
  } catch (error) { res.status(400).json({ message: error.message }); }
});
app.delete('/api/pricing/fare/:id', requireAdminAccess('pricing.archive'), async (req,res) => {
  try {
    const filter=objectIdFilter(req.params.id),col=db().collection('fare_configs'),existing=await col.findOne(filter);
    if(!existing)return res.status(404).json({message:'Không tìm thấy bảng giá'});
    const r=await col.deleteOne(filter);if(!r.deletedCount)return res.status(404).json({message:'Không tìm thấy bảng giá'});
    await auditAdmin(req,'FARE_DELETE','FARE_CONFIG',existing._id,pricingDoc(existing),null);res.json({success:true});
  } catch(error){res.status(400).json({message:error.message})}
});

app.post('/api/pricing/platform-fee', requireAdminAccess('fees.manage'), async (req,res) => {
  try {
    requireField(req.body,'serviceCode'); requireField(req.body,'areaCode');
    if (!req.body.driverCommission || String(req.body.driverCommission.value ?? '').trim() === '') throw new Error('Thiếu hoa hồng tài xế');
    const serviceCode=normalizeCode(req.body.serviceCode), areaCode=normalizeCode(req.body.areaCode), status=['DRAFT','ACTIVE'].includes(req.body.status)?req.body.status:'DRAFT';
    await ensurePricingScope({serviceCode,areaCode}); const version=await nextVersion('platform_fees',serviceCode,areaCode); if(status==='ACTIVE')await archiveOtherActive('platform_fees',serviceCode,areaCode);
    const now=new Date(), doc={serviceCode,areaCode,version:asInt(version),status,driverCommission:{type:req.body.driverCommission.type==='FIXED'?'FIXED':'PERCENT',value:asNumber(req.body.driverCommission.value)},effectiveFrom:status==='ACTIVE'?now:null,effectiveTo:null,createdAt:now,updatedAt:now};
    for (const key of ['bookingFee','customerServiceFee','driverFixedFee','paymentFeePercent']) { const v=nullableNumber(req.body[key]); if(v!==null) doc[key]=v; }
    const r=await db().collection('platform_fees').insertOne(doc);const created=pricingDoc({...doc,_id:r.insertedId});
    await auditAdmin(req,'PLATFORM_FEE_CREATE','PLATFORM_FEE',r.insertedId,null,created);res.status(201).json(created);
  } catch(error){res.status(400).json({message:error.message})}
});
app.put('/api/pricing/platform-fee/:id', requireAdminAccess('fees.manage'), async (req,res) => {
  try {
    const id=new mongoose.Types.ObjectId(req.params.id), col=db().collection('platform_fees'), existing=await col.findOne({_id:id}); if(!existing)return res.status(404).json({message:'Không tìm thấy cấu hình phí nền tảng'});
    if(!req.body.driverCommission || String(req.body.driverCommission.value ?? '').trim()==='')throw new Error('Thiếu hoa hồng tài xế');
    const status=['DRAFT','ACTIVE','ARCHIVED'].includes(req.body.status)?req.body.status:existing.status; if(status==='ACTIVE')await archiveOtherActive('platform_fees',existing.serviceCode,existing.areaCode,id);
    const clean={status,driverCommission:{type:req.body.driverCommission.type==='FIXED'?'FIXED':'PERCENT',value:asNumber(req.body.driverCommission.value)},updatedAt:new Date()}, unset={};
    for (const key of ['bookingFee','customerServiceFee','driverFixedFee','paymentFeePercent']) { const v=nullableNumber(req.body[key]); if(v===null) unset[key]=''; else clean[key]=v; }
    if(status==='ACTIVE'&&!existing.effectiveFrom)clean.effectiveFrom=new Date();
    const update={$set:clean}; if(Object.keys(unset).length)update.$unset=unset;
    const r=await col.findOneAndUpdate({_id:id},update,{returnDocument:'after'});
    await auditAdmin(req,'PLATFORM_FEE_UPDATE','PLATFORM_FEE',id,pricingDoc(existing),pricingDoc(r));res.json(pricingDoc(r));
  } catch(error){res.status(400).json({message:error.message})}
});
app.delete('/api/pricing/platform-fee/:id', requireAdminAccess('fees.manage'), async (req,res) => {
  try {const filter=objectIdFilter(req.params.id),col=db().collection('platform_fees'),existing=await col.findOne(filter);if(!existing)return res.status(404).json({message:'Không tìm thấy cấu hình phí'});const r=await col.deleteOne(filter);if(!r.deletedCount)return res.status(404).json({message:'Không tìm thấy cấu hình phí'});await auditAdmin(req,'PLATFORM_FEE_DELETE','PLATFORM_FEE',existing._id,pricingDoc(existing),null);res.json({success:true});}
  catch(error){res.status(400).json({message:error.message})}
});

app.post('/api/pricing/surcharge', requireAdminAccess('fees.manage'), async (req,res) => {
  try {
    for(const key of ['code','name','serviceCode','calculationType','value','status']) requireField(req.body,key);
    const code=normalizeCode(req.body.code), serviceCode=normalizeCode(req.body.serviceCode); if(!['FIXED','PERCENT','MULTIPLIER'].includes(req.body.calculationType))throw new Error('Kiểu phụ phí không hợp lệ'); if(!['ACTIVE','INACTIVE'].includes(req.body.status))throw new Error('Trạng thái phụ phí không hợp lệ');
    const col=db().collection('surcharges'); if(await col.findOne({code}))return res.status(409).json({message:`Mã phụ phí ${code} đã tồn tại`});
    const areas=Array.isArray(req.body.areaCodes)?req.body.areaCodes.map(normalizeCode).filter(Boolean):[]; await ensurePricingScope({serviceCode,areaCode:areas[0]||'GLOBAL'});
    const now=new Date(), doc={code,name:String(req.body.name).trim(),serviceCode,areaCodes:areas,calculationType:req.body.calculationType,value:asNumber(req.body.value),conditions:null,status:req.body.status,createdAt:now,updatedAt:now}; const r=await col.insertOne(doc);const created=pricingDoc({...doc,_id:r.insertedId});await auditAdmin(req,'SURCHARGE_CREATE','SURCHARGE',r.insertedId,null,created);res.status(201).json(created);
  } catch(error){res.status(400).json({message:error.message})}
});
app.patch('/api/pricing/surcharge/:id', requireAdminAccess('fees.manage'), async (req,res) => {
  try { const clean={...req.body,updatedAt:new Date()}; delete clean._id; delete clean.id; if('code'in clean)clean.code=normalizeCode(clean.code); if('serviceCode'in clean)clean.serviceCode=normalizeCode(clean.serviceCode); if('areaCodes'in clean)clean.areaCodes=Array.isArray(clean.areaCodes)?clean.areaCodes.map(normalizeCode).filter(Boolean):[]; if('value'in clean)clean.value=asNumber(clean.value); const filter=objectIdFilter(req.params.id),col=db().collection('surcharges'),existing=await col.findOne(filter);if(!existing)return res.status(404).json({message:'Không tìm thấy phụ phí'});const r=await col.findOneAndUpdate(filter,{$set:clean},{returnDocument:'after'}); if(!r)return res.status(404).json({message:'Không tìm thấy phụ phí'});await auditAdmin(req,'SURCHARGE_UPDATE','SURCHARGE',existing._id,pricingDoc(existing),pricingDoc(r)); res.json(pricingDoc(r)); } catch(error){res.status(400).json({message:error.message})}
});
app.delete('/api/pricing/surcharge/:id', requireAdminAccess('fees.manage'), async (req,res) => {
  try {const filter=objectIdFilter(req.params.id),col=db().collection('surcharges'),existing=await col.findOne(filter);if(!existing)return res.status(404).json({message:'Không tìm thấy phụ phí'});const r=await col.deleteOne(filter);if(!r.deletedCount)return res.status(404).json({message:'Không tìm thấy phụ phí'});await auditAdmin(req,'SURCHARGE_DELETE','SURCHARGE',existing._id,pricingDoc(existing),null);res.json({success:true});}
  catch(error){res.status(400).json({message:error.message})}
});

app.post('/api/fares/estimate', async (req,res) => {
  try {
    const serviceCode=normalizeCode(req.body?.serviceCode), areaCode=normalizeCode(req.body?.areaCode||'GLOBAL'), distanceKm=Math.max(0,asNumber(req.body?.distanceKm)), durationMinutes=Math.max(0,asNumber(req.body?.durationMinutes));
    const selected=Array.isArray(req.body?.surchargeCodes)?req.body.surchargeCodes.map(normalizeCode):[]; if(!serviceCode)return res.status(400).json({message:'Thiếu serviceCode'});
    const fare=await findActiveConfig('fare_configs',serviceCode,areaCode); if(!fare)return res.status(404).json({message:`Không tìm thấy bảng giá ACTIVE cho ${serviceCode}.`}); const fee=await findActiveConfig('platform_fees',serviceCode,areaCode);
    const baseFare=asNumber(fare.baseFare), minimumFare=asNumber(fare.minimumFare), timeFare=durationMinutes*asNumber(fare.pricePerMinute); let distanceFare=0;
    for(const tier of (Array.isArray(fare.distanceTiers)?fare.distanceTiers:[])){const from=Math.max(0,asNumber(tier.fromKm)),to=tier.toKm==null?Infinity:Math.max(from,asNumber(tier.toKm));if(distanceKm>from)distanceFare+=Math.max(0,Math.min(distanceKm,to)-from)*asNumber(tier.pricePerKm)}
    const rideFare=Math.max(minimumFare,baseFare+distanceFare+timeFare); let surcharge=0; const appliedSurcharges=[];
    if(selected.length){const docs=await db().collection('surcharges').find({serviceCode,status:'ACTIVE',code:{$in:selected},$or:[{areaCodes:areaCode},{areaCodes:'GLOBAL'},{areaCodes:{$size:0}},{areaCodes:{$exists:false}}]}).toArray();for(const item of docs){const value=asNumber(item.value);let amount=item.calculationType==='FIXED'?value:item.calculationType==='PERCENT'?rideFare*value/100:item.calculationType==='MULTIPLIER'?rideFare*Math.max(0,value-1):0;surcharge+=amount;appliedSurcharges.push({code:item.code,name:item.name,calculationType:item.calculationType,value,amount:Math.round(amount)})}}
    const bookingFee=asNumber(fee?.bookingFee),customerServiceFee=asNumber(fee?.customerServiceFee),paymentFeePercent=asNumber(fee?.paymentFeePercent),beforePayment=rideFare+surcharge+bookingFee+customerServiceFee,paymentFee=beforePayment*paymentFeePercent/100,rawTotal=beforePayment+paymentFee,roundingUnit=asNumber(fare.roundingUnit); if(roundingUnit<=0)return res.status(500).json({message:'roundingUnit của bảng giá ACTIVE không hợp lệ'}); const total=Math.round(rawTotal/roundingUnit)*roundingUnit;
    res.json({serviceCode,requestedAreaCode:areaCode,appliedAreaCode:fare.areaCode,fallbackToGlobal:fare.areaCode!==areaCode,distanceKm,durationMinutes,currency:fare.currency||'VND',fareConfigVersion:asNumber(fare.version),platformFeeVersion:fee?asNumber(fee.version):null,pricing:{baseFare,distanceFare:Math.round(distanceFare),timeFare:Math.round(timeFare),minimumFare,rideFare:Math.round(rideFare),surcharge:Math.round(surcharge),appliedSurcharges,bookingFee,customerServiceFee,paymentFee:Math.round(paymentFee),subtotal:Math.round(rawTotal),roundingUnit,total}});
  } catch(error){res.status(500).json({message:error.message})}
});

const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) return res.sendFile(path.join(distDir, 'index.html'));
    next();
  });
}

async function start() {
  try {
    console.log('⏳ Đang kết nối MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 12000 });
    console.log(`✅ MongoDB connected: ${DB_NAME}`);
    await ensureAdminRbacSeed();
    console.log('✅ Admin RBAC ready: users + admin_roles');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ TH79 iMove Admin Gateway 1.5.1: http://localhost:${PORT}`);
      console.log(`🔎 Kiểm tra: http://localhost:${PORT}/api/health`);
      console.log(`🔗 Core Backend: ${CORE_BACKEND_URL} (HTTP ${CORE_HTTP_PORT})`);
      console.log(`🔎 Discovery fallback: Atlas registry + UDP ${CORE_DISCOVERY_PORT} + LAN scan`);
      discoverCoreBackend(true).then(baseUrl => {
        if (baseUrl) {
          console.log(`✅ Core Backend tự kết nối: ${baseUrl} (${coreCache.source})`);
        } else {
          console.log('⚠️ Chưa tìm thấy Core Backend. Admin sẽ tự thử lại khi có request.');
        }
      }).catch(() => {});
    });
  } catch (error) {
    console.error('❌ Không kết nối được MongoDB:', error.message);
    console.error('Kiểm tra server/.env và MongoDB Atlas > Network Access.');
    process.exit(1);
  }
}

start();
