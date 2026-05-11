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
        # Add phone and address to customers
        cursor.execute("PRAGMA table_info(customers)")
        columns = [column[1] for column in cursor.fetchall()]
        if "phone" not in columns:
            print("Adding phone column to customers...")
            cursor.execute("ALTER TABLE customers ADD COLUMN phone TEXT")
        if "address" not in columns:
            print("Adding address column to customers...")
            cursor.execute("ALTER TABLE customers ADD COLUMN address TEXT")

        # Add payment_date to orders
        cursor.execute("PRAGMA table_info(orders)")
        columns = [column[1] for column in cursor.fetchall()]
        if "payment_date" not in columns:
            print("Adding payment_date column to orders...")
            cursor.execute("ALTER TABLE orders ADD COLUMN payment_date DATETIME")

        conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
