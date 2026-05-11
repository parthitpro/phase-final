import openpyxl

def inspect_formulas_and_hidden(file_path, sheet_name):
    wb = openpyxl.load_workbook(file_path, data_only=False)
    ws = wb[sheet_name]
    
    print(f"--- Sheet: {sheet_name} ---")
    
    # Check for hidden columns
    hidden_cols = []
    for col_letter, col_dim in ws.column_dimensions.items():
        if col_dim.hidden:
            hidden_cols.append(col_letter)
    print(f"Hidden Columns: {hidden_cols}")
    
    # Check for hidden rows
    hidden_rows = []
    for row_num, row_dim in ws.row_dimensions.items():
        if row_dim.hidden:
            hidden_rows.append(row_num)
    print(f"Hidden Rows (first 10 if many): {hidden_rows[:10]}")

    # Inspect formulas in the first few data rows
    print("\n--- Formula Inspection (Rows 1-10) ---")
    for row in ws.iter_rows(min_row=1, max_row=10):
        row_vals = []
        for cell in row:
            if cell.value and isinstance(cell.value, str) and cell.value.startswith('='):
                row_vals.append(f"{cell.coordinate}: {cell.value}")
        if row_vals:
            print(f"Row {row[0].row}: " + " | ".join(row_vals))

if __name__ == "__main__":
    file_path = "April orders.xlsx"
    sheets = ["30-04-2026", "Original", "Weight Summary"]
    for s in sheets:
        try:
            inspect_formulas_and_hidden(file_path, s)
            print("\n" + "="*50 + "\n")
        except Exception as e:
            print(f"Error in sheet {s}: {e}")
