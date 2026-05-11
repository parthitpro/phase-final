import sqlite3
import os

db_path = "orders.db"

def migrate():
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Add is_payment_approved to orders table
        cursor.execute("PRAGMA table_info(orders)")
        columns = [column[1] for column in cursor.fetchall()]
        if "is_payment_approved" not in columns:
            print("Adding is_payment_approved column to orders...")
            cursor.execute("ALTER TABLE orders ADD COLUMN is_payment_approved INTEGER DEFAULT 0")
            
            # Default existing paid orders to approved
            print("Approving existing paid orders...")
            cursor.execute("UPDATE orders SET is_payment_approved = 1 WHERE payment_status IN ('Cash', 'UPI')")
        
        conn.commit()
        print("Migration v4 successful.")
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
