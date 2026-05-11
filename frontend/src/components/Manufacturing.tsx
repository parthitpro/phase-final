import type { Order, Customer, Product } from '../schema';
import { formatWeight } from '../utils/formatters';

export const ManufacturingPacking = ({ orders, customers, products }: { orders: Order[], customers: Customer[], products: Product[] }) => {
  const calculatePacking = (category: 'Wholesale' | 'Retail') => {
    // Trust that the orders passed in are already filtered for the correct date/status
    const relevantOrders = orders.filter(o => {
      const cust = customers.find(c => c.id === o.customer_id);
      return cust?.category?.toLowerCase() === category.toLowerCase();
    });
    
    const aggregation: Record<string, number> = {};
    relevantOrders.forEach(o => {
      o.items.forEach(item => {
        const productName = item.name || products.find(p => p.id === item.product_id)?.name || `Unknown (ID: ${item.product_id})`;
        aggregation[productName] = (aggregation[productName] || 0) + item.weight;
      });
    });

    return Object.entries(aggregation).sort((a, b) => b[1] - a[1]);
  };

  const wholesalePacking = calculatePacking('Wholesale');
  const retailPacking = calculatePacking('Retail');

  return (
    <div className="packing-summary-grid">
      <div className="packing-card">
        <div className="packing-header wholesale">
          WHOLESALE PACKING SUMMARY
          <span style={{fontSize: '0.8rem', opacity: 0.8}}>{wholesalePacking.length} Items</span>
        </div>
        <table className="packing-table">
          <thead><tr><th>Product</th><th style={{textAlign: 'right'}}>Total Weight</th></tr></thead>
          <tbody>
            {wholesalePacking.map(([name, weight]) => (
              <tr key={name}><td>{name}</td><td style={{textAlign: 'right'}}>{formatWeight(weight)} kg</td></tr>
            ))}
            {wholesalePacking.length === 0 && <tr><td colSpan={2} style={{textAlign: 'center', color: 'var(--text-muted)', padding: '2rem'}}>No wholesale orders pending</td></tr>}
          </tbody>
          {wholesalePacking.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td>GRAND TOTAL</td>
                <td style={{textAlign: 'right'}}>{formatWeight(wholesalePacking.reduce((sum, [, w]) => sum + w, 0))} kg</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="packing-card">
        <div className="packing-header retail">
          RETAIL PACKING SUMMARY
          <span style={{fontSize: '0.8rem', opacity: 0.8}}>{retailPacking.length} Items</span>
        </div>
        <table className="packing-table">
          <thead><tr><th>Product</th><th style={{textAlign: 'right'}}>Total Weight</th></tr></thead>
          <tbody>
            {retailPacking.map(([name, weight]) => (
              <tr key={name}><td>{name}</td><td style={{textAlign: 'right'}}>{formatWeight(weight)} kg</td></tr>
            ))}
            {retailPacking.length === 0 && <tr><td colSpan={2} style={{textAlign: 'center', color: 'var(--text-muted)', padding: '2rem'}}>No retail orders pending</td></tr>}
          </tbody>
          {retailPacking.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td>GRAND TOTAL</td>
                <td style={{textAlign: 'right'}}>{formatWeight(retailPacking.reduce((sum, [, w]) => sum + w, 0))} kg</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export const AnimatedPacking = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width: 60, height: 60}}>
    <g className="anim-box">
      <path d="M12 28L32 16L52 28V48L32 60L12 48V28Z" fill="#FDE68A" stroke="#D97706" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M32 16V38" stroke="#D97706" strokeWidth="3" strokeLinecap="round"/>
      <path d="M12 28L32 38L52 28" stroke="#D97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 22L42 34" className="anim-tape" stroke="#B45309" strokeWidth="4" strokeLinecap="round"/>
    </g>
  </svg>
);

export const ProductAnimation = ({ name }: { name: string }) => {
  const isSpicy = name.toLowerCase().includes('masala') || name.toLowerCase().includes('chilli') || name.toLowerCase().includes('thepla');
  const isSweet = name.toLowerCase().includes('sweet') || name.toLowerCase().includes('chocolate');
  
  const color = isSpicy ? '#ef4444' : isSweet ? '#8b5cf6' : '#ea580c';
  
  return (
    <div className="product-anim-icon">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width: 32, height: 32}}>
        <circle cx="32" cy="32" r="28" stroke={color} strokeWidth="2" strokeDasharray="4 4" className="khakhra-spinner" />
        <circle cx="32" cy="32" r="20" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1" />
        <path d="M22 32H42" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M32 22V42" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};

export const AnimatedDelivery = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width: 45, height: 45}}>
    <g className="anim-truck">
      <path d="M8 24H40V44H8V24Z" fill="#EA580C" stroke="#C2410C" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M40 30H52L56 36V44H40V30Z" fill="#F97316" stroke="#C2410C" strokeWidth="3" strokeLinejoin="round"/>
      <circle cx="20" cy="46" r="6" fill="#1E293B" className="anim-wheel"/>
      <circle cx="48" cy="46" r="6" fill="#1E293B" className="anim-wheel"/>
      <path d="M42 32H48L50 36H42V32Z" fill="#94A3B8"/>
      <path d="M4 28H0" className="anim-wind" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round"/>
      <path d="M6 34H0" className="anim-wind" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" style={{animationDelay: '0.2s'}}/>
      <path d="M4 40H0" className="anim-wind" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" style={{animationDelay: '0.4s'}}/>
    </g>
  </svg>
);
