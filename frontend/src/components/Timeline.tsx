import { Icons } from './Icons';
import type { Order } from '../schema';

const statusHierarchy = [
  { label: 'Received', icon: <Icons.Orders />, value: 'Received' },
  { label: 'Baking', icon: <Icons.Flame />, value: 'In Manufacturing' },
  { label: 'Packed', icon: <Icons.Bag />, value: 'Ready for Delivery' },
  { label: 'Shipping', icon: <Icons.Delivery />, value: 'Out for Delivery' },
  { label: 'Delivered', icon: <Icons.Check />, value: 'Delivered' }
];

export const VerticalTimeline = ({ order }: { order: Order }) => {
  const iconStyle = { width: 14, height: 14 };
  const logs = [...(order.logs || [])].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const currentStatus = order.order_status;
  const isCancelled = currentStatus === 'Cancelled';

  if (isCancelled) return <div className="badge danger" style={{padding: '1rem', borderRadius: '12px'}}><Icons.Ban style={{marginRight: '8px'}} /> ORDER CANCELLED</div>;

  const currentRank = statusHierarchy.findIndex(s => s.value === currentStatus);

  return (
    <div className="vertical-log-timeline">
      {statusHierarchy.map((s, idx) => {
        const logEntry = logs.find(l => l.status_reached === s.value);
        const isActive = currentStatus === s.value;
        const isCompleted = currentRank > idx || currentStatus === 'Delivered';
        const isFuture = !isActive && !isCompleted;

        return (
          <div key={s.label} className={`log-entry-v ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isFuture ? 'future' : ''}`}>
            <div className="log-visual-v">
              <div className="log-dot-v">
                {isCompleted ? <Icons.CheckCircle style={iconStyle} /> : 
                 isActive ? (s.value === 'In Manufacturing' ? <Icons.Flame style={iconStyle} /> : 
                            s.value === 'Ready for Delivery' ? <Icons.Bag style={iconStyle} /> : 
                            s.value === 'Out for Delivery' ? <Icons.Delivery style={iconStyle} /> :
                            s.value === 'Delivered' ? <Icons.Check style={iconStyle} /> :
                            <Icons.Orders style={iconStyle} />) : 
                 (s.value === 'In Manufacturing' ? <Icons.Flame style={iconStyle} /> : 
                  s.value === 'Ready for Delivery' ? <Icons.Bag style={iconStyle} /> : 
                  s.value === 'Out for Delivery' ? <Icons.Delivery style={iconStyle} /> :
                  s.value === 'Delivered' ? <Icons.Check style={iconStyle} /> :
                  <Icons.Orders style={iconStyle} />)}
              </div>
              {idx < statusHierarchy.length - 1 && <div className="log-connector-v"></div>}
            </div>
            <div className="log-content-v">
              <div className="log-header-v">
                <span className="log-status-text-v" style={{color: isActive ? 'var(--accent)' : isCompleted ? 'var(--success)' : 'var(--text-muted)'}}>{s.label}</span>
                {logEntry && (
                  <span className="log-time-text-v">
                    {new Date(logEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              {logEntry && logEntry.description && (
                <div className="log-desc-text-v">{logEntry.description}</div>
              )}
              {isActive && !logEntry && (
                <div className="log-desc-text-v" style={{color: 'var(--accent)', fontStyle: 'italic'}}>Processing...</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const HorizontalTimeline = ({ order }: { order: Order }) => {
  const currentStatus = order.order_status;
  
  if (currentStatus === 'Cancelled') {
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 800, fontSize: '0.75rem', padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '10px'}}>
        <Icons.Cancel style={{width: 14, height: 14}} /> CANCELLED
      </div>
    );
  }

  const currentRank = statusHierarchy.findIndex(s => s.value === currentStatus);
  const progress = currentRank === -1 ? 0 : (currentRank / (statusHierarchy.length - 1)) * 100;

  return (
    <div className="horizontal-timeline-mini" style={{minWidth: '280px'}}>
      <div className="timeline-track-container" style={{ padding: '0 12px', position: 'relative', marginBottom: '1.25rem' }}>
        <div className="timeline-track" style={{ height: '4px', background: 'var(--border)', borderRadius: '10px', position: 'relative' }}>
          <div className="timeline-progress" style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${progress}%`,
            background: 'var(--success)',
            borderRadius: '10px',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
          }} />
          
          <div className="timeline-steps" style={{
            display: 'flex', justifyContent: 'space-between', position: 'absolute',
            top: '50%', left: '-12px', right: '-12px', transform: 'translateY(-50%)'
          }}>
            {statusHierarchy.map((s, idx) => {
              const isCompleted = currentRank > idx || currentStatus === 'Delivered';
              const isActive = currentStatus === s.value;
              
              return (
                <div key={s.label} className={isActive ? 'anim-pulse' : ''} style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: isCompleted ? 'var(--success)' : 'var(--card-bg)',
                  border: `2px solid ${isCompleted ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isCompleted ? 'white' : isActive ? 'var(--accent)' : 'var(--text-muted)',
                  zIndex: 2, transition: 'all 0.4s',
                  boxShadow: isActive ? '0 0 12px var(--accent-soft)' : 'none'
                }}>
                  {isCompleted ? <Icons.Check style={{width: 12, height: 12}} /> : 
                   isActive ? <div style={{width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%'}} /> :
                   <div style={{width: 4, height: 4, background: 'var(--border)', borderRadius: '50%'}} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="timeline-labels" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
        {statusHierarchy.map((s, idx) => {
          const isCompleted = currentRank > idx || currentStatus === 'Delivered';
          const isActive = currentStatus === s.value;
          return (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45px' }}>
              <span style={{
                fontSize: '0.6rem',
                fontWeight: isActive ? 900 : 700,
                color: isActive ? 'var(--accent)' : isCompleted ? 'var(--success)' : 'var(--text-muted)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                transition: 'color 0.3s',
                opacity: (isActive || isCompleted) ? 1 : 0.6
              }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Timeline = ({ order }: { order: Order }) => {
  return <HorizontalTimeline order={order} />;
};
