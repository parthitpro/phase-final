import requests
import json
import time

API_URL = "http://127.0.0.1:8000/ai-context"

def test_ai_context():
    print("=== TESTING BACKEND AI CONTEXT ENDPOINT ===")
    
    try:
        start_time = time.time()
        response = requests.get(API_URL, timeout=10)
        duration = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Received context in {duration:.2f}s")
            
            # Verify Structure
            required_keys = ["product_catalog", "total_outstanding_debt", "debt_details", "recent_activity"]
            missing = [k for k in required_keys if k not in data]
            
            if not missing:
                print("✅ Data structure is valid.")
            else:
                print(f"❌ Missing keys: {missing}")
                return

            # Print Summary (Simulating what the AI would see)
            print("\n--- AI Context Summary ---")
            print(f"Products in Catalog: {len(data['product_catalog'])}")
            print(f"Total Debt: ₹{data['total_outstanding_debt']}")
            print(f"Recent Orders Captured: {len(data['recent_activity'])}")
            
            if data['debt_details']:
                print("\nTop Debtor:")
                top = data['debt_details'][0]
                print(f" - {top['customer']}: ₹{top['amount']} ({top['date']})")
            
            if data['recent_activity']:
                print("\nLatest Order:")
                latest = data['recent_activity'][0]
                print(f" - ID #{latest['id']}: {latest['summary']} [Status: {latest['status']}]")

            print("\n=== TEST COMPLETE ===")
            
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_ai_context()
