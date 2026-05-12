from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    wholesale_price = Column(Float)
    retail_price = Column(Float)
    is_active = Column(Integer, default=1) # 1 for True, 0 for False (sqlite compatible)

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    category = Column(String) # "Wholesale" or "Retail"
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    date = Column(DateTime, default=datetime.datetime.now) # Changed to local now
    total_amount = Column(Float)
    summary_text = Column(String)
    payment_status = Column(String, default="Pending") # "Pending", "Cash", "UPI", "Debt"
    payment_date = Column(DateTime, nullable=True)
    is_payment_approved = Column(Integer, default=0) # 0 for False, 1 for True
    order_status = Column(String, default="Received") # "Received", "In Manufacturing", "Ready for Delivery", "Out for Delivery", "Delivered", "Cancelled"
    
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    logs = relationship("OrderLog", back_populates="order", cascade="all, delete-orphan")

class OrderLog(Base):
    __tablename__ = "order_logs"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    status_reached = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.now)
    description = Column(String, nullable=True)

    order = relationship("Order", back_populates="logs")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    weight = Column(Float)
    calculated_price = Column(Float)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")

    @property
    def name(self):
        return self.product.name if self.product else "Unknown"
