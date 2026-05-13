from backend.database import SessionLocal
from backend.models import Customer, Order, OrderItem, OrderLog

def reset_database():
    print("WARNING: This will delete transactional data (Orders, Customers, Logs).")
    print("Products and Price List will be preserved.")
    
    db = SessionLocal()
    try:
        # Delete in reverse order of dependencies
        print("Clearing Order Items...")
        db.query(OrderItem).delete()
        
        print("Clearing Order Logs...")
        db.query(OrderLog).delete()
        
        print("Clearing Orders...")
        db.query(Order).delete()
        
        print("Clearing Customers...")
        db.query(Customer).delete()
        
        # Products are NOT deleted
        
        db.commit()
        print("Database cleared successfully (Products preserved).")
    except Exception as e:
        print(f"Error resetting database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_database()
