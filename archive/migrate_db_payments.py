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
        # Check if column already exists
        cursor.execute("PRAGMA table_info(orders)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if "payment_status" not in columns:
            print("Adding payment_status column to orders table...")
            cursor.execute("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'Pending'")
            conn.commit()
            print("Migration successful.")
        else:
            print("payment_status column already exists.")

    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
