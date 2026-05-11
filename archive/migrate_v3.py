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
        # 1. Add order_status to orders table
        cursor.execute("PRAGMA table_info(orders)")
        columns = [column[1] for column in cursor.fetchall()]
        if "order_status" not in columns:
            print("Adding order_status column to orders...")
            cursor.execute("ALTER TABLE orders ADD COLUMN order_status TEXT DEFAULT 'Received'")
            
            # Initialize older orders as "Delivered" if they were already paid or marked as Debt
            print("Initializing existing orders status...")
            cursor.execute("UPDATE orders SET order_status = 'Delivered' WHERE payment_status IN ('Cash', 'UPI', 'Debt')")
        
        # 2. Create order_logs table
        print("Creating order_logs table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS order_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER,
                status_reached TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                description TEXT,
                FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
            )
        """)

        conn.commit()
        print("Migration v3 successful.")
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
