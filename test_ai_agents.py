import requests
import json
import time

API_URL = "http://localhost:8000/chat"
API_KEY = "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"
MODEL = "google/gemma-4-31b-it:free"

class TestAgent:
    def __init__(self, name, persona):
        self.name = name
        self.persona = persona
        self.history = []

    def ask(self, question):
        print(f"\n[{self.name}] is asking: {question}")
        self.history.append({"role": "user", "content": question})
        
        payload = {
            "messages": self.history,
            "api_key": API_KEY,
            "model_name": MODEL
        }
        
        try:
            response = requests.post(API_URL, json=payload, timeout=60)
            if response.status_code == 200:
                answer = response.json().get("response", "No response field")
                print(f"[AI Assistant]: {answer}")
                self.history.append({"role": "assistant", "content": answer})
                return answer
            else:
                print(f"Error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Request failed: {e}")
            return None

def run_test():
    print("=== STARTING AI AGENT TEST SESSION ===")
    
    # Agent 1: Viren (The Owner)
    owner = TestAgent("Viren (Owner)", "I am the owner. I want to know about my money and debts.")
    
    # Agent 2: Sarah (The Analyst)
    analyst = TestAgent("Sarah (Analyst)", "I am a business analyst. I want to know which products are performing best.")

    print("\n--- Phase 1: Debt Verification ---")
    owner.ask("Who owes me the most money right now and how much is the total debt?")

    print("\n--- Phase 2: Inventory Analysis ---")
    analyst.ask("Based on the product catalog, which items have the highest retail price?")

    print("\n--- Phase 3: Recent Activity ---")
    owner.ask("Summarize the last 3 orders for me.")

    print("\n=== TEST SESSION COMPLETE ===")

if __name__ == "__main__":
    run_test()
