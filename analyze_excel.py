import pandas as pd
import sys

def analyze_excel(file_path):
    try:
        xl = pd.ExcelFile(file_path)
        print(f"File: {file_path}")
        print(f"Sheets: {xl.sheet_names}")
        print("-" * 30)

        for sheet_name in xl.sheet_names:
            print(f"\n--- Sheet: {sheet_name} ---")
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            print("\nFirst 5 rows:")
            print(df.head())
            
            print("\nColumn Info:")
            print(df.info())
            
            print("\nSummary Statistics (Numeric):")
            print(df.describe())
            
            print("\nNull Values:")
            print(df.isnull().sum())
            print("-" * 30)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        analyze_excel(sys.argv[1])
    else:
        print("Please provide a file path.")
