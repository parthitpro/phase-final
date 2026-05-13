import { Icons } from './Icons';
import type { Order } from '../schema';

const statusHierarchy = [
  { label: 'Received', icon: <Icons.Orders />, value: 'Received' },
  { label: 'Baking', icon: <Icons.Flame />, value: 'In Manufacturing' },
  { label: 'Packed', icon: <Icons.Bag />, value: 'Ready for Delivery' },
  { label: 'Shipping', icon: <Icons.Delivery />, value: 'Out for Delivery' },
  { label: 'Delivered', icon: <Icons.Check />, value: 'Delivered' },
  { label: 'Settlement', icon: <Icons.Money />, value: 'Paid' }
];

const formatLogTime = (timestamp: string) => {
  const d = new Date(timestamp);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const VerticalTimeline = ({ order }: { order: Order }) => {
  const iconStyle = { width: 14, height: 14 };
  const logs = [...(order.logs || [])].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const currentStatus = order.order_status;
  const isCancelled = currentStatus === 'Cancelled';

  if (isCancelled) return <div className="badge danger" style={{padding: '1rem', borderRadius: '12px'}}><Icons.Ban style={{marginRight: '8px'}} /> ORDER CANCELLED</div>;

  const currentRank = statusHierarchy.findIndex(s => s.value === currentStatus);
  const isPaid = order.payment_status === 'Cash' || order.payment_status === 'UPI';
  const isDebt = order.payment_status === 'Debt';
  const isSettled = isPaid || isDebt;

  return (
    <div className="vertical-log-timeline">
      {statusHierarchy.map((s, idx) => {
        let logEntry = logs.find(l => l.status_reached === s.value);
        if (s.value === 'Paid') {
          logEntry = logs.find(l => l.status_reached === 'Paid' || l.status_reached === 'Debt');
        }

        // Fallback for Delivered timestamp if forced by payment
        let displayTime = '';
        if (logEntry) {
          displayTime = formatLogTime(logEntry.timestamp);
        } else if (s.value === 'Delivered' && isSettled && order.payment_date) {
          displayTime = formatLogTime(order.payment_date);
        } else if (s.value === 'Paid' && isSettled && order.payment_date) {
           displayTime = formatLogTime(order.payment_date);
        }

        const isCompleted = (currentRank > idx) || (isSettled && s.value !== 'Paid') || (s.value === 'Paid' && isPaid);
        const isActive = (currentStatus === s.value && !isSettled) || (s.value === 'Paid' && isDebt);
        const isFuture = !isActive && !isCompleted;

        return (
          <div key={s.label} className={`log-entry-v ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isFuture ? 'future' : ''} ${s.value === 'Paid' && isDebt ? 'debt-step' : ''}`}>
            <div className="log-visual-v">
              <div className="log-dot-v" style={{ 
                background: (s.value === 'Paid' && isPaid) ? 'var(--success)' : (s.value === 'Paid' && isDebt) ? 'var(--danger)' : undefined,
                borderColor: (s.value === 'Paid' && isPaid) ? 'var(--success)' : (s.value === 'Paid' && isDebt) ? 'var(--danger)' : undefined,
                color: (s.value === 'Paid' && (isPaid || isDebt)) ? 'white' : undefined
              }}>
                {isCompleted ? <Icons.CheckCircle style={iconStyle} /> : 
                 (s.value === 'Paid' && isDebt) ? <Icons.Alert style={iconStyle} /> :
                 isActive ? (s.value === 'In Manufacturing' ? <Icons.Flame style={iconStyle} /> : 
                            s.value === 'Ready for Delivery' ? <Icons.Bag style={iconStyle} /> : 
                            s.value === 'Out for Delivery' ? <Icons.Delivery style={iconStyle} /> :
                            s.value === 'Delivered' ? <Icons.CheckCircle style={{...iconStyle, color: 'var(--success)'}} /> :
                            <Icons.Orders style={iconStyle} />) : 
                 (s.value === 'In Manufacturing' ? <Icons.Flame style={iconStyle} /> : 
                  s.value === 'Ready for Delivery' ? <Icons.Bag style={iconStyle} /> : 
                  s.value === 'Out for Delivery' ? <Icons.Delivery style={iconStyle} /> :
                  s.value === 'Delivered' ? <Icons.Check style={iconStyle} /> :
                  s.value === 'Paid' ? <Icons.Money style={iconStyle} /> :
                  <Icons.Orders style={iconStyle} />)}
              </div>
              {idx < statusHierarchy.length - 1 && <div className="log-connector-v"></div>}
            </div>
            <div className="log-content-v">
              <div className="log-header-v">
                <span className="log-status-text-v" style={{
                  color: (s.value === 'Paid' && isPaid) ? 'var(--success)' : (s.value === 'Paid' && isDebt) ? 'var(--danger)' : isActive ? 'var(--accent)' : isCompleted ? 'var(--success)' : 'var(--text-muted)',
                  fontWeight: (isActive || isCompleted) ? 800 : 500
                }}>
                  {s.value === 'Paid' ? (isDebt ? 'Debt Recorded' : isPaid ? 'Payment Received' : 'Settlement Pending') : s.label} 
                  {(isCompleted || isActive) && s.value === 'Delivered' && ' ✓'}
                  {isPaid && s.value === 'Paid' && ' ✓'}
                </span>
                {displayTime && (
                  <span className="log-time-text-v">
                    {displayTime}
                  </span>
                )}
              </div>
              {logEntry && logEntry.description && (
                <div className="log-desc-text-v">{logEntry.description}</div>
              )}
              {isActive && !displayTime && s.value !== 'Paid' && (
                <div className="log-desc-text-v" style={{color: 'var(--accent)', fontStyle: 'italic'}}>Current Stage</div>
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
  const logs = order.logs || [];
  
  if (currentStatus === 'Cancelled') {
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 800, fontSize: '0.75rem', padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '10px'}}>
        <Icons.Cancel style={{width: 14, height: 14}} /> CANCELLED
      </div>
    );
  }

  const currentRank = statusHierarchy.findIndex(s => s.value === currentStatus);
  const isPaid = order.payment_status === 'Cash' || order.payment_status === 'UPI';
  const isDebt = order.payment_status === 'Debt';
  const isSettled = isPaid || isDebt;
  
  const totalSteps = statusHierarchy.length - 1;
  let effectiveRank = currentRank;
  if (isPaid) effectiveRank = totalSteps; 
  else if (isDebt) effectiveRank = totalSteps;
  
  const progress = effectiveRank === -1 ? 0 : (effectiveRank / totalSteps) * 100;

  return (
    <div className="horizontal-timeline-mini" style={{minWidth: '350px'}}>
      <div className="timeline-track-container" style={{ padding: '0 12px', position: 'relative', marginBottom: '1.25rem' }}>
        <div className="timeline-track" style={{ height: '4px', background: 'var(--border)', borderRadius: '10px', position: 'relative' }}>
          <div className="timeline-progress" style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${progress}%`,
            background: isDebt ? 'var(--danger)' : 'var(--success)',
            borderRadius: '10px',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 10px ${isDebt ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
          }} />
          
          <div className="timeline-steps" style={{
            display: 'flex', justifyContent: 'space-between', position: 'absolute',
            top: '50%', left: '-12px', right: '-12px', transform: 'translateY(-50%)'
          }}>
            {statusHierarchy.map((s, idx) => {
              const isStepCompleted = (currentRank > idx) || (isSettled && s.value !== 'Paid') || (s.value === 'Paid' && isPaid);
              const isStepActive = (currentStatus === s.value && !isSettled) || (s.value === 'Paid' && isDebt);
              const isStepDebt = s.value === 'Paid' && isDebt;
              
              return (
                <div key={s.label} className={isStepActive ? 'anim-pulse' : ''} style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: isStepDebt ? 'var(--danger)' : isStepCompleted ? 'var(--success)' : 'var(--card-bg)',
                  border: `2px solid ${isStepDebt ? 'var(--danger)' : isStepCompleted ? 'var(--success)' : isStepActive ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: (isStepCompleted || isStepDebt) ? 'white' : isStepActive ? 'var(--accent)' : 'var(--text-muted)',
                  zIndex: 2, transition: 'all 0.4s',
                  boxShadow: isStepActive ? '0 0 12px var(--accent-soft)' : 'none'
                }}>
                  {isStepCompleted ? <Icons.Check style={{width: 12, height: 12}} /> : 
                   isStepDebt ? <Icons.Alert style={{width: 12, height: 12}} /> :
                   isStepActive ? <div style={{width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%'}} /> :
                   <div style={{width: 4, height: 4, background: 'var(--border)', borderRadius: '50%'}} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="timeline-labels" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
        {statusHierarchy.map((s, idx) => {
          const isStepCompleted = (currentRank > idx) || (isSettled && s.value !== 'Paid') || (s.value === 'Paid' && isPaid);
          const isStepActive = (currentStatus === s.value && !isSettled) || (s.value === 'Paid' && isDebt);
          const isStepDebt = s.value === 'Paid' && isDebt;
          
          let logEntry = logs.find(l => l.status_reached === s.value);
          if (s.value === 'Paid') {
            logEntry = logs.find(l => l.status_reached === 'Paid' || l.status_reached === 'Debt');
          }
          
          let displayTime = '';
          if (logEntry) {
            displayTime = formatLogTime(logEntry.timestamp);
          } else if (s.value === 'Delivered' && isSettled && order.payment_date) {
            displayTime = formatLogTime(order.payment_date);
          } else if (s.value === 'Paid' && isSettled && order.payment_date) {
            displayTime = formatLogTime(order.payment_date);
          }
          
          return (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '55px' }}>
              <span style={{
                fontSize: '0.6rem',
                fontWeight: (isStepActive || isStepCompleted) ? 900 : 700,
                color: isStepDebt ? 'var(--danger)' : isStepActive ? 'var(--accent)' : isStepCompleted ? 'var(--success)' : 'var(--text-muted)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                transition: 'color 0.3s',
                opacity: (isStepActive || isStepCompleted) ? 1 : 0.6
              }}>
                {s.value === 'Paid' ? (isStepDebt ? 'DEBT' : 'PAID') : s.label}
              </span>
              {(isStepActive || isStepCompleted) && displayTime && (
                <span style={{
                  fontSize: '0.55rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginTop: '2px',
                  opacity: 0.8,
                  textAlign: 'center',
                  lineHeight: 1.1
                }}>
                  {displayTime}
                </span>
              )}
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
