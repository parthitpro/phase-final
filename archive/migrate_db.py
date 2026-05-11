import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('orders.db')
        cursor = conn.cursor()
        
        # Add is_active to products
        try:
            cursor.execute("ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1;")
            print("Added is_active column to products table.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("is_active column already exists in products.")
            else:
                print(f"Error adding is_active to products: {e}")
        
        # Check if customer name needs unique index
        # SQLite doesn't easily allow ALTER TABLE to add UNIQUE.
        # We can add a unique index instead.
        try:
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_name ON customers(name);")
            print("Ensured unique index on customer names.")
        except sqlite3.OperationalError as e:
            print(f"Error creating unique index on customers: {e}")

        conn.commit()
        conn.close()
        print("Migration complete.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
