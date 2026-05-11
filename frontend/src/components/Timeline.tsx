import { Icons } from './Icons';
import type { Order } from '../schema';

export const VerticalTimeline = ({ order }: { order: Order }) => {
  const iconStyle = { width: 14, height: 14 };
  const statuses = [
    { label: 'Received', icon: <Icons.Orders style={iconStyle} />, value: 'Received' },
    { label: 'Baking', icon: <Icons.Flame style={iconStyle} />, value: 'In Manufacturing' },
    { label: 'Packed', icon: <Icons.Bag style={iconStyle} />, value: 'Ready for Delivery' },
    { label: 'Shipping', icon: <Icons.Delivery style={iconStyle} />, value: 'Out for Delivery' },
    { label: 'Delivered', icon: <Icons.Check style={iconStyle} />, value: 'Delivered' }
  ];

  const logs = [...(order.logs || [])].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const currentStatus = order.order_status;
  const isCancelled = currentStatus === 'Cancelled';

  if (isCancelled) return <div className="badge danger"><Icons.Ban style={iconStyle} /> ORDER CANCELLED</div>;

  return (
    <div className="vertical-log-timeline">
      {statuses.map((s, idx) => {
        const logEntry = logs.find(l => l.status_reached === s.value);
        const isActive = currentStatus === s.value;
        const isCompleted = logs.some(l => l.status_reached === s.value) && !isActive;
        const isFuture = !logEntry && !isActive;

        return (
          <div key={s.label} className={`log-entry-v ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isFuture ? 'future' : ''}`}>
            <div className="log-visual-v">
              <div className="log-dot-v">
                {isCompleted ? <Icons.CheckCircle style={iconStyle} /> : s.icon}
              </div>
              {idx < statuses.length - 1 && <div className="log-connector-v"></div>}
            </div>
            <div className="log-content-v">
              <div className="log-header-v">
                <span className="log-status-text-v">{s.label}</span>
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
                <div className="log-desc-text-v" style={{color: 'var(--accent)', fontStyle: 'italic'}}>Current Stage...</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const HorizontalTimeline = ({ order }: { order: Order }) => {
  const iconStyle = { width: 14, height: 14 };
  const statuses = [
    { label: 'Received', icon: <Icons.Orders style={iconStyle} />, value: 'Received' },
    { label: 'Baking', icon: <Icons.Flame style={iconStyle} />, value: 'In Manufacturing' },
    { label: 'Packed', icon: <Icons.Bag style={iconStyle} />, value: 'Ready for Delivery' },
    { label: 'Shipping', icon: <Icons.Delivery style={iconStyle} />, value: 'Out for Delivery' },
    { label: 'Delivered', icon: <Icons.Check style={iconStyle} />, value: 'Delivered' }
  ];

  const currentStatus = order.order_status;
  
  // Calculate progress percentage
  const statusValues = statuses.map(s => s.value);
  const currentIndex = statusValues.indexOf(currentStatus);
  const progress = ((currentIndex) / (statuses.length - 1)) * 100;

  if (currentStatus === 'Cancelled') {
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 800, fontSize: '0.75rem'}}>
        <Icons.Cancel style={iconStyle} /> CANCELLED
      </div>
    );
  }

  return (
    <div className="horizontal-timeline-mini" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      padding: '1rem 0',
      minWidth: '320px'
    }}>
      <div className="timeline-track-container" style={{
        padding: '0 15px',
        position: 'relative'
      }}>
        <div className="timeline-track" style={{
          height: '6px',
          background: 'var(--border)',
          borderRadius: '10px',
          position: 'relative'
        }}>
          <div className="timeline-progress" style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progress}%`,
            background: 'var(--success)',
            borderRadius: '10px',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 10px var(--success-soft)'
          }} />
          
          <div className="timeline-steps" style={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'absolute',
            top: '50%',
            left: '-10px',
            right: '-10px',
            transform: 'translateY(-50%)'
          }}>
            {statuses.map((s, idx) => {
              const isCompleted = statusValues.indexOf(currentStatus) > idx || currentStatus === 'Delivered';
              const isActive = currentStatus === s.value;
              
              return (
                <div key={s.label} className={isActive ? 'anim-pulse' : ''} style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isCompleted ? 'var(--success)' : isActive ? 'var(--card-bg)' : 'var(--card-bg)',
                  border: `3px solid ${isCompleted ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isCompleted ? 'white' : isActive ? 'var(--accent)' : 'var(--text-muted)',
                  zIndex: 2,
                  transition: 'all 0.4s',
                  boxShadow: isActive ? '0 0 15px var(--accent-soft)' : 'none'
                }}>
                  {isCompleted ? <Icons.Check style={{width: 12, height: 12}} /> : 
                   isActive ? <div style={{width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%'}} /> :
                   <div style={{width: 6, height: 6, background: 'var(--border)', borderRadius: '50%'}} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="timeline-labels" style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.65rem',
        fontWeight: 900,
        color: 'var(--text-muted)',
        padding: '0 5px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {statuses.map((s) => {
          const isCompleted = statusValues.indexOf(currentStatus) > statusValues.indexOf(s.value) || currentStatus === 'Delivered';
          const isActive = currentStatus === s.value;
          return (
            <div key={s.label} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '50px',
              gap: '2px'
            }}>
              <span style={{
                color: isActive ? 'var(--accent)' : isCompleted ? 'var(--success)' : 'inherit',
                transition: 'color 0.3s'
              }}>
                {s.label}
              </span>
              {isActive && <div style={{width: '4px', height: '4px', background: 'var(--accent)', borderRadius: '50%'}} />}
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
