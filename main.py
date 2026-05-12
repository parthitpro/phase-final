from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import pandas as pd
import os
import datetime
import logging
import models, database, schemas
import ai_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    database.init_db()

# --- PRODUCTS ---
@app.get("/products", response_model=List[schemas.Product])
def get_products(db: Session = Depends(database.get_db)):
    return db.query(models.Product).all()

@app.post("/products", response_model=schemas.Product)
def create_product(product: schemas.ProductBase, db: Session = Depends(database.get_db)):
    # Case-insensitive uniqueness check
    existing = db.query(models.Product).filter(models.Product.name.ilike(product.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product with this name already exists")
    
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.put("/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product_update: schemas.ProductBase, db: Session = Depends(database.get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Case-insensitive uniqueness check if name is being changed
    if db_product.name.lower() != product_update.name.lower():
        existing = db.query(models.Product).filter(models.Product.name.ilike(product_update.name)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Product with this name already exists")

    db_product.name = product_update.name
    db_product.wholesale_price = product_update.wholesale_price
    db_product.retail_price = product_update.retail_price
    db_product.is_active = product_update.is_active
    db.commit()
    db.refresh(db_product)
    return db_product

# --- CUSTOMERS ---
@app.get("/customers", response_model=List[schemas.Customer])
def get_customers(db: Session = Depends(database.get_db)):
    return db.query(models.Customer).all()

@app.put("/customers/{customer_id}", response_model=schemas.Customer)
def update_customer(customer_id: int, customer_update: schemas.CustomerUpdate, db: Session = Depends(database.get_db)):
    db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if customer_update.name and db_customer.name.lower() != customer_update.name.lower():
        existing = db.query(models.Customer).filter(models.Customer.name.ilike(customer_update.name)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Customer with this name already exists")
        db_customer.name = customer_update.name

    if customer_update.category: db_customer.category = customer_update.category
    if customer_update.phone is not None: db_customer.phone = customer_update.phone
    if customer_update.address is not None: db_customer.address = customer_update.address
    if customer_update.notes is not None: db_customer.notes = customer_update.notes
    db.commit()
    db.refresh(db_customer)
    return db_customer

@app.delete("/customers/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(database.get_db)):
    db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(db_customer)
    db.commit()
    return {"message": "Customer and all associated orders deleted"}

def add_order_log(db: Session, order_id: int, status: str, description: str = None):
    try:
        # If this is an 'undo' or manual status set, we should remove logs that come "after" this new status
        # to keep the timeline clean.
        status_order = ["Received", "In Manufacturing", "Ready for Delivery", "Out for Delivery", "Delivered", "Cancelled"]
        if status in status_order:
            current_idx = status_order.index(status)
            future_statuses = status_order[current_idx + 1:]
            if status != "Cancelled": # Don't clear logs if cancelling, but clear if moving back FROM cancelled
                db.query(models.OrderLog).filter(
                    models.OrderLog.order_id == order_id,
                    models.OrderLog.status_reached.in_(future_statuses)
                ).delete(synchronize_session=False)

        log = models.OrderLog(order_id=order_id, status_reached=status, description=description)
        db.add(log)
        db.flush()
    except Exception as e:
        logger.error(f"Failed to add order log for order {order_id}: {e}")
        # We do not raise the exception or rollback the whole transaction here 
        # because the log is non-critical compared to the order itself.
        db.expunge_all() # Ensure the failed log object is removed from session

# --- ORDERS ---
@app.get("/orders", response_model=List[schemas.Order])
def get_orders(db: Session = Depends(database.get_db)):
    return db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product),
        joinedload(models.Order.logs)
    ).order_by(models.Order.date.desc()).all()

@app.get("/orders/{order_id}", response_model=schemas.Order)
def get_order(order_id: int, db: Session = Depends(database.get_db)):
    db_order = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product),
        joinedload(models.Order.logs)
    ).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    return db_order

@app.put("/orders/{order_id}/status", response_model=schemas.Order)
def update_order_status(order_id: int, status: str, description: Optional[str] = None, db: Session = Depends(database.get_db)):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db_order.order_status = status
    add_order_log(db, order_id, status, description)
    db.commit()
    db.refresh(db_order)
    return db_order

@app.put("/orders/{order_id}/cancel", response_model=schemas.Order)
def cancel_order(order_id: int, reason: Optional[str] = "Cancelled by user", db: Session = Depends(database.get_db)):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db_order.order_status = "Cancelled"
    # If it was debt or pending, it shouldn't be anymore if cancelled? 
    # Actually, keep payment status for history but mark it cancelled.
    add_order_log(db, order_id, "Cancelled", reason)
    db.commit()
    db.refresh(db_order)
    return db_order

@app.put("/orders/{order_id}/approve-payment", response_model=schemas.Order)
def approve_payment(order_id: int, db: Session = Depends(database.get_db)):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db_order.is_payment_approved = 1
    # Ensure it's marked delivered if payment is approved
    if db_order.order_status != "Delivered":
        db_order.order_status = "Delivered"
        
    add_order_log(db, order_id, "Completed", "Payment verified and order finalized.")
    db.commit()
    db.refresh(db_order)
    return db_order

@app.delete("/orders/{order_id}")
def delete_order(order_id: int, db: Session = Depends(database.get_db)):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(db_order)
    db.commit()
    return {"message": "Order deleted"}

@app.post("/orders", response_model=schemas.Order)
def create_order(order: schemas.OrderCreate, db: Session = Depends(database.get_db)):
    # Case-insensitive customer lookup
    customer = db.query(models.Customer).filter(models.Customer.name.ilike(order.customer_name)).first()
    if not customer:
        customer = models.Customer(name=order.customer_name, category=order.category)
        db.add(customer)
        db.flush()
    else:
        customer.category = order.category
    
    db_order = models.Order(customer_id=customer.id, total_amount=0, summary_text="", payment_status="Pending", order_status="Received")
    db.add(db_order)
    db.flush()
    
    total_amount, summary_parts = process_order_items(db, db_order, order.items, order.category)
    
    db_order.total_amount = total_amount
    db_order.summary_text = f"{customer.name} ->> " + ", ".join(summary_parts) + f", Total = {total_amount}"
    
    add_order_log(db, db_order.id, "Received", "Order placed by user")
    
    db.commit()
    db.refresh(db_order)
    return db_order

@app.put("/orders/{order_id}", response_model=schemas.Order)
def update_order(order_id: int, order_update: schemas.OrderUpdate, db: Session = Depends(database.get_db)):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order_update.payment_status:
        # Update payment_date if status changed from Pending/Debt to Cash/UPI
        is_paid = order_update.payment_status in ["Cash", "UPI"]
        was_unpaid = db_order.payment_status in ["Pending", "Debt"]
        
        if was_unpaid and is_paid:
            db_order.payment_date = datetime.datetime.now()
            db_order.is_payment_approved = 1 # AUTO-APPROVE
            add_order_log(db, order_id, "Paid", f"Payment completed via {order_update.payment_status}")
            db_order.order_status = "Delivered" 
        # Clear payment_date if changed back to Pending or Debt
        elif order_update.payment_status in ["Pending", "Debt"]:
            db_order.payment_date = None
            db_order.is_payment_approved = 0
            if order_update.payment_status == "Debt":
                add_order_log(db, order_id, "Debt", "Marked as Outstanding Debt")
                db_order.order_status = "Delivered" # Ensure it's marked as delivered if it's debt
            
        db_order.payment_status = order_update.payment_status
    
    if order_update.customer_name:
        # Case-insensitive customer lookup
        customer = db.query(models.Customer).filter(models.Customer.name.ilike(order_update.customer_name)).first()
        if not customer:
            customer = models.Customer(name=order_update.customer_name, category=order_update.category or "Retail")
            db.add(customer)
            db.flush()
        elif order_update.category:
            customer.category = order_update.category
        
        db_order.customer_id = customer.id
    
    if order_update.items is not None:
        db.query(models.OrderItem).filter(models.OrderItem.order_id == order_id).delete()
        # Use the updated customer or existing one
        customer = db.query(models.Customer).filter(models.Customer.id == db_order.customer_id).first()
        category = order_update.category or customer.category
        total_amount, summary_parts = process_order_items(db, db_order, order_update.items, category)
        db_order.total_amount = total_amount
        db_order.summary_text = f"{customer.name} ->> " + ", ".join(summary_parts) + f", Total = {total_amount}"
    elif order_update.customer_name:
        # If only name changed, update summary_text too
        parts = db_order.summary_text.split(" ->> ")
        if len(parts) > 1:
            db_order.summary_text = f"{order_update.customer_name} ->> {parts[1]}"

    db.commit()
    db.refresh(db_order)
    return db_order

def process_order_items(db, db_order, items, category):
    total_amount = 0
    summary_parts = []
    for item in items:
        if item.weight <= 0:
            continue
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product: continue
        price = product.wholesale_price if category == "Wholesale" else product.retail_price
        # Rounding to 2 decimal places for financial calculations
        calc_price = round(price * item.weight, 2)
        total_amount += calc_price
        summary_parts.append(f"{product.name} ({item.weight}kg)")
        db_item = models.OrderItem(order_id=db_order.id, product_id=product.id, weight=item.weight, calculated_price=calc_price)
        db.add(db_item)
    return round(total_amount, 2), summary_parts

@app.get("/export")
def export_orders(date: str = None, db: Session = Depends(database.get_db)):
    query = db.query(models.Order)
    if date:
        try:
            start_date = datetime.datetime.strptime(date, "%Y-%m-%d")
            end_date = start_date + datetime.timedelta(days=1)
            query = query.filter(models.Order.date >= start_date, models.Order.date < end_date)
        except ValueError:
            pass
    
    orders = query.all()
    data = []
    for o in orders:
        items_summary = ""
        if ' ->> ' in o.summary_text:
            parts = o.summary_text.split(' ->> ')
            if len(parts) > 1:
                items_summary = parts[1]
        
        if ', Total =' in items_summary:
            items_summary = items_summary.split(', Total =')[0]
            
        data.append({
            "Order ID": o.id,
            "Date": o.date.strftime("%d-%b-%Y") if o.date else "",
            "Time": o.date.strftime("%H:%M") if o.date else "",
            "Customer": o.customer.name if o.customer else "Unknown",
            "Category": o.customer.category if o.customer else "N/A",
            "Items Summary": items_summary.strip(),
            "Total Amount": o.total_amount,
            "Payment Status": o.payment_status,
            "Order Status": o.order_status
        })
    
    if not data:
        return {"message": "No data found for this date"}

    df = pd.DataFrame(data)
    filename = f"Viren_Orders_{date}.xlsx" if date else "Viren_All_Orders.xlsx"
    export_path = f"temp_{filename}"
    df.to_excel(export_path, index=False)
    return FileResponse(export_path, filename=filename, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

# --- MANUFACTURING & DELIVERY ---
@app.get("/manufacturing/pending")
def get_pending_manufacturing(date_from: str = None, date_to: str = None, db: Session = Depends(database.get_db)):
    query = db.query(models.Order).filter(models.Order.order_status == "Received")
    if date_from:
        query = query.filter(models.Order.date >= date_from)
    if date_to:
        query = query.filter(models.Order.date <= date_to)
    
    orders = query.all()
    aggregation = {}
    order_ids = [o.id for o in orders]

    for o in orders:
        for item in o.items:
            p_name = item.product.name
            aggregation[p_name] = aggregation.get(p_name, 0) + item.weight
            
    return {
        "summary": [{"product": k, "total_weight": v} for k, v in aggregation.items()],
        "order_ids": order_ids
    }

@app.post("/manufacturing/bulk-dispatch")
def bulk_dispatch_manufacturing(order_ids: List[int], db: Session = Depends(database.get_db)):
    orders = db.query(models.Order).filter(models.Order.id.in_(order_ids)).all()
    for o in orders:
        o.order_status = "In Manufacturing"
        add_order_log(db, o.id, "In Manufacturing", "Bulk dispatched to production")
    db.commit()
    return {"message": f"{len(orders)} orders sent to manufacturing"}

@app.post("/manufacturing/bulk-ready")
def bulk_ready_delivery(order_ids: List[int], db: Session = Depends(database.get_db)):
    orders = db.query(models.Order).filter(models.Order.id.in_(order_ids)).all()
    for o in orders:
        o.order_status = "Ready for Delivery"
        add_order_log(db, o.id, "Ready for Delivery", "Production completed, ready for dispatch")
    db.commit()
    return {"message": f"{len(orders)} orders marked as ready for delivery"}

@app.post("/delivery/bulk-dispatch")
def bulk_dispatch_delivery(order_ids: List[int], db: Session = Depends(database.get_db)):
    orders = db.query(models.Order).filter(models.Order.id.in_(order_ids)).all()
    for o in orders:
        o.order_status = "Out for Delivery"
        add_order_log(db, o.id, "Out for Delivery", "Order dispatched for delivery")
    db.commit()
    return {"message": f"{len(orders)} orders out for delivery"}

# --- AI CHAT ---
@app.post("/chat")
def chat_with_ai(request: schemas.ChatRequest, db: Session = Depends(database.get_db)):
    logger.info(f"Chat Request: model={request.model_name}, api_key_present={bool(request.api_key)}")
    try:
        # Gather live business context
        context = ai_service.get_business_context(db)
        
        # Format messages for OpenAI SDK
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        
        # Get response from AI
        response = ai_service.get_ai_response(
            api_key=request.api_key,
            model_name=request.model_name,
            messages=messages,
            context=context
        )
        
        return {"response": response}
    except Exception as e:
        logger.error(f"Chat API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
