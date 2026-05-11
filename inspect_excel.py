import pandas as pd

def inspect_sheet(file_path, sheet_name):
    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
    print(f"--- Sheet: {sheet_name} (Raw First 10 Rows) ---")
    print(df.head(10).to_string())

if __name__ == "__main__":
    file_path = "April orders.xlsx"
    inspect_sheet(file_path, "30-04-2026")
    inspect_sheet(file_path, "Original")
    inspect_sheet(file_path, "Production summary")
