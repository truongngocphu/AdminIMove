import React from 'react';
import { AlertTriangle, LoaderCircle, RefreshCw, ShieldX, Inbox } from 'lucide-react';

function StateCard({className,icon:Icon,title,description,onRetry}){
  return <section className={`admin-state-card ${className}`} role={className==='state-error'?'alert':'status'} aria-live="polite">
    <span className="admin-state-icon"><Icon size={24}/></span>
    <div><h3>{title}</h3><p>{description}</p>{onRetry&&<button type="button" className="button" onClick={onRetry}><RefreshCw size={15}/> Thử lại</button>}</div>
  </section>;
}
export function PageLoading({text='Đang lấy dữ liệu...'}){return <StateCard className="state-loading" icon={LoaderCircle} title={text} description="Yêu cầu sẽ tự dừng nếu Backend phản hồi quá thời gian."/>}
export function PageEmpty({title='Chưa có dữ liệu',description='Không có bản ghi phù hợp với điều kiện hiện tại.'}){return <StateCard className="state-empty" icon={Inbox} title={title} description={description}/>}
export function PageError({message='Không thể tải dữ liệu.',onRetry}){return <StateCard className="state-error" icon={AlertTriangle} title="Không thể tải dữ liệu" description={message} onRetry={onRetry}/>}
export function PermissionDenied({message='Tài khoản hiện tại chưa được cấp quyền truy cập chức năng này.'}){return <StateCard className="state-permission" icon={ShieldX} title="Không có quyền truy cập" description={message}/>}
