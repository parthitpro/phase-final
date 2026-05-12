import json
from datetime import datetime
from sqlalchemy.orm import Session
import models

def get_business_context(db: Session):
    """Gathers real-time business data to give to the AI."""
    
    # 1. Products
    products = db.query(models.Product).filter(models.Product.is_active == 1).all()
    product_list = [{"name": p.name, "wholesale": p.wholesale_price, "retail": p.retail_price} for p in products]
    
    # 2. Outstanding Debt
    debts = db.query(models.Order).filter(models.Order.payment_status == 'Debt', models.Order.order_status != 'Cancelled').all()
    debt_list = []
    total_debt = 0
    for d in debts:
        # Extract customer name from summary_text if possible
        c_name = d.summary_text.split(' ->>')[0] if d.summary_text else "Unknown"
        debt_list.append({"customer": c_name, "amount": d.total_amount, "date": str(d.date)})
        total_debt += d.total_amount
        
    # 3. Recent Orders (Last 10)
    recent_orders = db.query(models.Order).order_by(models.Order.id.desc()).limit(10).all()
    orders_summary = []
    for o in recent_orders:
        orders_summary.append({
            "id": o.id,
            "summary": o.summary_text,
            "amount": o.total_amount,
            "status": o.order_status,
            "payment": o.payment_status
        })
        
    context = {
        "current_time": str(datetime.now()),
        "product_catalog": product_list,
        "total_outstanding_debt": total_debt,
        "debt_details": debt_list[:20], # Limit to top 20 for token safety
        "recent_activity": orders_summary
    }
    
    return json.dumps(context)
