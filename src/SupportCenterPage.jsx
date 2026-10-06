import React from 'react';
import {
  CheckCircle2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { coreApiRequest } from './coreApi.js';
import { hasPermission } from './adminApi.js';

function dateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
}

function roleText(roles = []) {
  const labels = {
    CUSTOMER: 'Khách hàng',
    DRIVER: 'Tài xế',
    MERCHANT: 'Merchant',
    ADMIN: 'Admin',
  };
  return (Array.isArray(roles) ? roles : [])
    .map((x) => labels[String(x).toUpperCase()] || x)
    .join(', ') || 'Người dùng';
}

export default function SupportCenterPage({ access }) {
  const [rows, setRows] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [conversation, setConversation] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('ALL');
  const [loadingList, setLoadingList] = React.useState(true);
  const [loadingChat, setLoadingChat] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [input, setInput] = React.useState('');
  const bottomRef = React.useRef(null);

  const canReply = hasPermission(access, 'support.reply');
  const canAssign = hasPermission(access, 'support.assign');
  const canClose = hasPermission(access, 'support.close');

  const loadList = React.useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingList(true);
    try {
      const params = new URLSearchParams({ limit: '100', status });
      if (query.trim()) params.set('q', query.trim());
      const data = await coreApiRequest(`/api/admin-support/conversations?${params.toString()}`);
      const next = Array.isArray(data) ? data : [];
      setRows(next);
      setError('');
      setSelectedId((current) => {
        if (current && next.some((x) => x.id === current)) return current;
        return next[0]?.id || '';
      });
    } catch (e) {
      if (!silent) setError(e.message || String(e));
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, [query, status]);

  const loadChat = React.useCallback(async (id, { silent = false } = {}) => {
    if (!id) {
      setConversation(null);
      setMessages([]);
      return;
    }
    if (!silent) setLoadingChat(true);
    try {
      const data = await coreApiRequest(`/api/admin-support/conversations/${encodeURIComponent(id)}/messages`);
      setConversation(data?.conversation || null);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      setRows((prev) => prev.map((x) => x.id === id ? { ...x, unread: 0, ...(data?.conversation || {}) } : x));
      setError('');
    } catch (e) {
      if (!silent) setError(e.message || String(e));
    } finally {
      if (!silent) setLoadingChat(false);
    }
  }, []);

  React.useEffect(() => { loadList(); }, [status, loadList]);
  React.useEffect(() => { if (selectedId) loadChat(selectedId); }, [selectedId, loadChat]);
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      loadList({ silent: true });
      if (selectedId) loadChat(selectedId, { silent: true });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loadList, loadChat, selectedId]);
  React.useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [messages]);

  async function sendMessage(e) {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || !selectedId || !canReply || sending) return;
    setSending(true);
    try {
      await coreApiRequest(`/api/admin-support/conversations/${encodeURIComponent(selectedId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setInput('');
      await Promise.all([loadChat(selectedId, { silent: true }), loadList({ silent: true })]);
    } catch (e2) {
      setError(e2.message || String(e2));
    } finally {
      setSending(false);
    }
  }

  async function updateConversation(body) {
    if (!selectedId) return;
    try {
      const updated = await coreApiRequest(`/api/admin-support/conversations/${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setConversation(updated);
      await loadList({ silent: true });
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  const current = conversation || rows.find((x) => x.id === selectedId) || null;

  return <section className="enterprise-page support-center-page">
    <header className="enterprise-page-head">
      <div>
        <span className="enterprise-eyebrow">CUSTOMER CARE · LIVE SUPPORT</span>
        <h1>Chat Support</h1>
        <p>Tiếp nhận và phản hồi hội thoại hỗ trợ từ User, Driver và Merchant.</p>
      </div>
      <button type="button" className="button" onClick={() => loadList()} disabled={loadingList}>
        <RefreshCw size={15}/> Làm mới
      </button>
    </header>

    {error && <div className="v73-alert support-alert">{error}</div>}

    <div className="support-layout">
      <aside className="card support-inbox">
        <header className="support-inbox-head">
          <div><b>Hộp thư hỗ trợ</b><small>{rows.length} hội thoại</small></div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Trạng thái hội thoại">
            <option value="ALL">Tất cả</option>
            <option value="OPEN">Đang mở</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </header>
        <form className="support-search" onSubmit={(e) => { e.preventDefault(); loadList(); }}>
          <Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tên, SĐT, email..."/>
        </form>
        <div className="support-thread-list">
          {loadingList && !rows.length && <div className="support-empty"><RefreshCw className="spin" size={20}/><span>Đang lấy hội thoại...</span></div>}
          {!loadingList && !rows.length && <div className="support-empty"><MessageCircle size={24}/><span>Chưa có hội thoại hỗ trợ.</span></div>}
          {rows.map((row) => <button key={row.id} type="button" className={`support-thread ${selectedId === row.id ? 'active' : ''}`} onClick={() => setSelectedId(row.id)}>
            <span className="support-avatar"><UserRound size={18}/></span>
            <span className="support-thread-copy">
              <b>{row.owner?.fullName || 'Người dùng'}</b>
              <small>{roleText(row.owner?.roles)} · {row.owner?.phone || '—'}</small>
              <em>{row.lastMessage || 'Chưa có nội dung'}</em>
            </span>
            <span className="support-thread-meta"><small>{dateTime(row.lastMessageAt || row.updatedAt)}</small>{Number(row.unread || 0) > 0 && <b>{row.unread}</b>}</span>
          </button>)}
        </div>
      </aside>

      <section className="card support-chat-panel">
        {!current ? <div className="support-empty support-empty-large"><MessageCircle size={36}/><h3>Chọn một hội thoại</h3><p>Nội dung chat sẽ hiển thị tại đây.</p></div> : <>
          <header className="support-chat-head">
            <div className="support-chat-user"><span className="support-avatar large"><UsersRound size={20}/></span><span><b>{current.owner?.fullName || 'Người dùng'}</b><small>{roleText(current.owner?.roles)} · {current.owner?.phone || '—'} · {current.owner?.email || '—'}</small></span></div>
            <div className="support-chat-actions">
              {canAssign && <button type="button" className="button button-small" onClick={() => updateConversation({ assignedToMe: true })}><CheckCircle2 size={15}/> Nhận xử lý</button>}
              {canClose && String(current.status || 'OPEN').toUpperCase() !== 'CLOSED' && <button type="button" className="button button-small danger-outline" onClick={() => updateConversation({ status: 'CLOSED' })}><XCircle size={15}/> Đóng</button>}
              {canClose && String(current.status || '').toUpperCase() === 'CLOSED' && <button type="button" className="button button-small" onClick={() => updateConversation({ status: 'OPEN' })}><RefreshCw size={15}/> Mở lại</button>}
            </div>
          </header>

          <div className="support-messages">
            {loadingChat && !messages.length && <div className="support-empty"><RefreshCw className="spin" size={20}/><span>Đang lấy tin nhắn...</span></div>}
            {messages.map((message) => {
              const mine = String(message.senderRole || '').toUpperCase() === 'ADMIN';
              const system = String(message.senderRole || '').toUpperCase() === 'SYSTEM';
              return <div key={message.id} className={`support-message-row ${mine ? 'mine' : ''} ${system ? 'system' : ''}`}>
                <div className="support-message-bubble"><span>{message.text}</span><small>{system ? 'Hệ thống' : mine ? 'Admin' : message.senderRole || 'Người dùng'} · {dateTime(message.createdAt)}</small></div>
              </div>;
            })}
            <div ref={bottomRef}/>
          </div>

          <form className="support-compose" onSubmit={sendMessage}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              disabled={!canReply || String(current.status || '').toUpperCase() === 'CLOSED'}
              rows={2}
              maxLength={2000}
              placeholder={canReply ? 'Nhập nội dung phản hồi... (Enter để gửi, Shift+Enter xuống dòng)' : 'Tài khoản chưa có quyền phản hồi.'}
            />
            <button type="submit" className="button button-primary support-send" disabled={!canReply || sending || !input.trim() || String(current.status || '').toUpperCase() === 'CLOSED'}><Send size={16}/>{sending ? 'Đang gửi...' : 'Gửi'}</button>
          </form>
        </>}
      </section>
    </div>
  </section>;
}
