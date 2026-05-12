from openai import OpenAI
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session
import models

# Configure logging for this module
logger = logging.getLogger(__name__)

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

def get_ai_response(api_key: str, model_name: str, messages: list, context: str):
    """Calls OpenRouter with business context and user messages with automatic fallback."""
    
    api_key = api_key.strip()
    model_name = model_name.strip()
    
    # List of models to try in order of preference
    # We include a mix of Google, Llama, and Qwen for reliability
    fallbacks = [
        "google/gemma-4-31b-it:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen3-coder:free",
        "z-ai/glm-4.5-air:free",
        "liquid/lfm-2.5-1.2b-instruct:free"
    ]
    
    models_to_try = [model_name]
    for f in fallbacks:
        if f != model_name:
            models_to_try.append(f)

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
        max_retries=0 # Disable SDK retries to use our custom fallback logic immediately
    )
    
    system_prompt = f"""You are 'Viren's Khakhra AI', a professional business assistant for a Khakhra manufacturing shop.
You have access to the REAL-TIME business data provided below. 
Your goal is to help the owner (Viren) analyze his business, check debts, and summarize sales.

RULES:
1. Use the provided data to answer questions accurately.
2. If the data doesn't contain the answer, say "I don't have that specific data right now."
3. Be concise, professional, and helpful.
4. If asked about debt, mention the specific customers and amounts.

CURRENT BUSINESS DATA:
{context}
"""
    
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    
    last_error = "Unknown error"
    
    for current_model in models_to_try:
        logger.info(f"Attempting AI request with model: {current_model}")
        try:
            # Set a lower timeout for each individual attempt to avoid overall hang
            response = client.chat.completions.create(
                model=current_model,
                messages=full_messages,
                extra_headers={
                    "HTTP-Referer": "https://viren-khakhra.com", 
                    "X-Title": "Virens Khakhra SaaS"
                },
                timeout=20 # 20 seconds per model
            )
            logger.info(f"AI Response received successfully from {current_model}")
            return response.choices[0].message.content
        except Exception as e:
            last_error = str(e)
            logger.warning(f"Model {current_model} failed: {last_error}")
            if "401" in last_error or "403" in last_error:
                # Auth errors shouldn't be retried with different models
                break
            # Continue to next model for 429, 404, 500 etc.
            continue
            
    return f"AI Service Error: All attempted models failed. Last error: {last_error}"
