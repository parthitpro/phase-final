import requests
import threading
import time
import random
import sys

BASE_URL = "http://localhost:8000"
AGENT_COUNT = 10
ORDER_COUNT_PER_AGENT = 10  # Increased load

def log(agent_id, msg):
    print(f"[Agent {agent_id}] {msg}")

def agent_task(agent_id):
    try:
        customer_name = f"AgentX-{agent_id}-{random.randint(1000, 9999)}"
        products = requests.get(f"{BASE_URL}/products").json()
        active_products = [p for p in products if p['is_active']]
        
        for i in range(ORDER_COUNT_PER_AGENT):
            # 1. Create Order
            items = [{"product_id": random.choice(active_products)['id'], "weight": random.randint(1, 5)} for _ in range(2)]
            res = requests.post(f"{BASE_URL}/orders", json={
                "customer_name": customer_name,
                "category": random.choice(["Retail", "Wholesale"]),
                "items": items
            })
            order = res.json()
            order_id = order['id']
            
            # 2. Random lifecycle speed
            stages = ["In Manufacturing", "Ready for Delivery", "Out for Delivery", "Delivered"]
            for stage in stages:
                time.sleep(random.uniform(0.01, 0.1))
                requests.put(f"{BASE_URL}/orders/{order_id}/status", params={"status": stage, "description": f"Processed by {agent_id}"})
            
            # 3. Random Payment
            pay_status = random.choice(["Cash", "UPI", "Debt"])
            requests.put(f"{BASE_URL}/orders/{order_id}", json={"payment_status": pay_status})
            
            if pay_status in ["Cash", "UPI"] and random.random() > 0.2:
                requests.put(f"{BASE_URL}/orders/{order_id}/approve-payment")
                
            log(agent_id, f"Finished Order #{order_id} ({pay_status})")

    except Exception as e:
        log(agent_id, f"CRITICAL ERROR: {e}")

def run_stress_test():
    log("MAIN", f"Starting parallel stress test with {AGENT_COUNT} agents...")
    threads = [threading.Thread(target=agent_task, args=(i,)) for i in range(AGENT_COUNT)]
    for t in threads: t.start()
    for t in threads: t.join()
    
    log("MAIN", "Simulation finished. Auditing synchronization...")
    orders = requests.get(f"{BASE_URL}/orders").json()
    
    unlogged_delivered = 0
    for o in orders:
        if "AgentX" in o['summary_text']:
            if o['order_status'] == 'Delivered':
                log_statuses = [l['status_reached'] for l in o['logs']]
                if 'Delivered' not in log_statuses:
                    unlogged_delivered += 1
    
    if unlogged_delivered > 0:
        log("MAIN", f"AUDIT FAILED: {unlogged_delivered} delivered orders missing from logs!")
        return False
        
    log("MAIN", "AUDIT PASSED: All parallel operations synchronized correctly.")
    return True

if __name__ == "__main__":
    success = run_stress_test()
    sys.exit(0 if success else 1)
