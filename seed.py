import pandas as pd
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend.models import Base, Product, Customer, Order, OrderItem
import os

def seed_data(file_path):
    # Initialize DB
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Load the "Original" sheet for products and prices
        df = pd.read_excel(file_path, sheet_name="Original", header=None)
        
        # Product names are in Row 5 (index 4), starting from Column D (index 3) to AI (index 34)
        # Wholesale prices are in Row 2 (index 1)
        # Retail prices are in Row 3 (index 2)
        
        products_row = 4
        wholesale_row = 1
        retail_row = 2
        
        # Determine the columns for products
        # Based on my previous inspection, columns D to AH contain weights
        # AH is index 33
        
        for col in range(3, 34): # D to AH
            product_name = df.iloc[products_row, col]
            if pd.isna(product_name) or str(product_name).strip() == "" or str(product_name).lower() == "total":
                continue
            
            wholesale_price = df.iloc[wholesale_row, col]
            retail_price = df.iloc[retail_row, col]
            
            # Convert to float safely
            try:
                w_price = float(wholesale_price) if not pd.isna(wholesale_price) else 0.0
                r_price = float(retail_price) if not pd.isna(retail_price) else 0.0
            except:
                w_price = 0.0
                r_price = 0.0

            # Add or update product
            existing_product = db.query(Product).filter(Product.name == product_name).first()
            if not existing_product:
                new_product = Product(
                    name=product_name,
                    wholesale_price=w_price,
                    retail_price=r_price
                )
                db.add(new_product)
                print(f"Added product: {product_name} (W: {w_price}, R: {r_price})")
        
        db.commit()
        print("Products seeded successfully.")

    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    excel_file = "April orders.xlsx"
    if os.path.exists(excel_file):
        seed_data(excel_file)
    else:
        print(f"File {excel_file} not found.")
