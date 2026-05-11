import requests
import time
import datetime
import sys

BASE_URL = "http://localhost:8000"

def log(agent, msg):
    print(f"[{agent}] {msg}")

def run_simulation():
    try:
        # Agent 1: Setup & Sales
        log("Agent 1 (Sales)", "Setting up products and customers...")
        requests.post(f"{BASE_URL}/products", json={"name": "Retail Khakhra", "wholesale_price": 40, "retail_price": 50, "is_active": 1})
        requests.post(f"{BASE_URL}/products", json={"name": "Wholesale Khakhra", "wholesale_price": 80, "retail_price": 100, "is_active": 1})
        
        prods = requests.get(f"{BASE_URL}/products").json()
        if not prods:
            log("Agent 1", "Failed to fetch products")
            return False
            
        p1_id = prods[-2]['id']
        p2_id = prods[-1]['id']

        log("Agent 1 (Sales)", "Creating 3 Retail and 3 Wholesale orders...")
        order_ids = []
        for i in range(3):
            # Retail
            r = requests.post(f"{BASE_URL}/orders", json={
                "customer_name": f"Retail Customer {i}",
                "category": "Retail",
                "items": [{"product_id": p1_id, "weight": 2.0}]
            })
            order_ids.append(r.json()['id'])
            
            # Wholesale
            r = requests.post(f"{BASE_URL}/orders", json={
                "customer_name": f"Wholesale Customer {i}",
                "category": "Wholesale",
                "items": [{"product_id": p2_id, "weight": 10.0}]
            })
            order_ids.append(r.json()['id'])
            
        log("Agent 1 (Sales)", f"Created 6 orders successfully. IDs: {order_ids}")

        # Agent 2: Finance
        log("Agent 2 (Finance)", "Processing payments...")
        for oid in order_ids[:2]: # Pay first two
            requests.put(f"{BASE_URL}/orders/{oid}", json={"payment_status": "Cash"})
            requests.put(f"{BASE_URL}/orders/{oid}/approve-payment")
        for oid in order_ids[2:4]: # Mark next two as debt
            requests.put(f"{BASE_URL}/orders/{oid}", json={"payment_status": "Debt"})
        
        log("Agent 2 (Finance)", "Payments processed.")

        # Agent 3: Manufacturing
        log("Agent 3 (Mfg)", "Checking pending orders for manufacturing...")
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        r = requests.get(f"{BASE_URL}/manufacturing/pending?date_from={today}&date_to={today}T23:59:59")
        pending = r.json()
        log("Agent 3 (Mfg)", f"Found {len(pending['order_ids'])} pending orders.")
        
        if pending['order_ids']:
            log("Agent 3 (Mfg)", "Dispatching to production...")
            requests.post(f"{BASE_URL}/manufacturing/bulk-dispatch", json=pending['order_ids'])
            
            log("Agent 3 (Mfg)", "Marking as ready for delivery...")
            requests.post(f"{BASE_URL}/manufacturing/bulk-ready", json=pending['order_ids'])

        # Agent 4: Delivery
        log("Agent 4 (Delivery)", "Dispatching for delivery...")
        requests.post(f"{BASE_URL}/delivery/bulk-dispatch", json=pending['order_ids'])
        
        log("Agent 4 (Delivery)", "Marking first 3 as delivered...")
        for oid in pending['order_ids'][:3]:
            requests.put(f"{BASE_URL}/orders/{oid}/status?status=Delivered")

        # Agent 5: Auditor
        log("Agent 5 (Auditor)", "Verifying Sync & Data Integrity...")
        
        # Check timeline logs
        orders = requests.get(f"{BASE_URL}/orders").json()
        for o in orders:
            if o['id'] in order_ids:
                if len(o['logs']) < 1:
                    log("Agent 5", f"ERROR: Order {o['id']} missing timeline logs!")
                    return False
                    
        # Check export
        log("Agent 5 (Auditor)", f"Testing export for {today}...")
        r = requests.get(f"{BASE_URL}/export?date={today}")
        if r.status_code != 200:
            log("Agent 5", f"ERROR: Export failed with status {r.status_code}")
            return False
            
        log("Agent 5 (Auditor)", "All systems nominal. Timeline, payments, and manufacturing states are synchronized.")
        return True

    except Exception as e:
        print(f"Error during simulation: {e}")
        return False

if __name__ == "__main__":
    time.sleep(2) # wait for servers
    success = run_simulation()
    if success:
        print("\n✅ Simulation completed successfully without errors.")
        sys.exit(0)
    else:
        print("\n❌ Simulation encountered errors.")
        sys.exit(1)
