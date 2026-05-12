from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ProductBase(BaseModel):
    name: str
    wholesale_price: float
    retail_price: float
    is_active: Optional[int] = 1

class Product(ProductBase):
    id: int
    class Config:
        from_attributes = True

class Customer(BaseModel):
    id: int
    name: str
    category: str
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    class Config:
        from_attributes = True

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class OrderItemBase(BaseModel):
    product_id: int
    weight: float

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int
    name: str
    calculated_price: float
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    customer_name: str
    category: str # Wholesale or Retail
    items: List[OrderItemCreate]

class OrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    category: Optional[str] = None
    items: Optional[List[OrderItemCreate]] = None
    payment_status: Optional[str] = None

class OrderLog(BaseModel):
    id: int
    status_reached: str
    timestamp: datetime
    description: Optional[str] = None
    class Config:
        from_attributes = True

class Order(BaseModel):
    id: int
    customer_id: int
    date: datetime
    total_amount: float
    summary_text: str
    payment_status: str
    payment_date: Optional[datetime] = None
    is_payment_approved: int
    order_status: str
    items: List[OrderItem]
    logs: List[OrderLog]
    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    api_key: str
    model_name: str
