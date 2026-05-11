# Viren's Khakhra - Master Project Blueprint

This document contains the complete technical specifications, architectural decisions, and business logic for the Viren's Khakhra ordering system. It is designed to allow an engineer to recreate or extend the project with full context in a single pass.

---

## 1. Project Vision
A specialized full-stack ordering and debt management system for a Khakhra business, replacing manual Excel tracking with a modern, high-performance web interface.

## 2. Technical Stack
- **Frontend**: React 19, Vite, TypeScript, Vanilla CSS.
- **Backend**: Python FastAPI, SQLAlchemy ORM, Uvicorn.
- **Database**: SQLite (with foreign key enforcement).
- **Icons**: Custom SVG system (standardized to 20px).

---

## 3. Database Schema (SQLite)

### Products (`products`)
- `id`: Integer, PK
- `name`: String (Unique, Case-insensitive check)
- `wholesale_price`: Float
- `retail_price`: Float
- `is_active`: Integer (0 or 1)

### Customers (`customers`)
- `id`: Integer, PK
- `name`: String (Unique, Case-insensitive check)
- `category`: String ("Wholesale" or "Retail")
- `phone`: String (Optional)
- `address`: String (Optional)
- `notes`: Text (Optional, for preferences like "Pack in small bags")

### Orders (`orders`)
- `id`: Integer, PK
- `customer_id`: Integer, FK (Cascading delete enabled)
- `date`: DateTime (Default: now)
- `total_amount`: Float (Rounded to 2 decimal places)
- `summary_text`: String (e.g., "Customer ->> Item A (1kg), Item B (2kg), Total = 100")
- `payment_status`: String ("Pending", "Cash", "UPI", "Debt")
- `payment_date`: DateTime (Recorded when status changes to Cash/UPI)

### Order Items (`order_items`)
- `id`: Integer, PK
- `order_id`: Integer, FK (Cascading delete enabled)
- `product_id`: Integer, FK
- `weight`: Float
- `calculated_price`: Float

---

## 4. Business Rules & Core Logic

### A. Price Calculation
- If Customer Category is **Wholesale**, use `product.wholesale_price`.
- If Customer Category is **Retail**, use `product.retail_price`.
- Total = Sum of (`weight` * `appropriate_price`) for all items.

### B. Repeat Order Suggestions (The "Smart" Algorithm)
- **Calculation**: Look at the customer's last 10 orders. If a product appears at least **twice**, mark it as a "Repeat" item.
- **Auto-Fill Logic**: When a customer is selected on the Dashboard, repeat items are highlighted. Clicking a repeat item auto-fills the `weight` input with the **last recorded weight** used for that specific customer and product.

### C. Money Collection Workflow
- **Pending**: New orders that haven't been assigned a payment method.
- **Cash/UPI**: Finalized payments. These move to "Received Today" and "Historical Payments".
- **Debt**: Specifically isolated for orders that are delivered but not paid. These stay in the "Outstanding Debts" section until cleared.

### D. Global Shortcuts
- **Ctrl + Enter**: Triggers `saveOrder()` globally. This is handled via a `window` event listener to ensure it works even if focus is not inside an input field.

---

## 5. Frontend Architecture (`App.tsx`)

### Tabs & Navigation
- `dashboard`: Order entry, repeat suggestions, modern receipt.
- `history`: Quick view of today's sales.
- `manage`: Full searchable list of all orders.
- `products`: Master inventory management (Active/Inactive toggle).
- `customers`: Deep-dive profiles, debt tracking, and behavior analysis.
- `analytics`: Revenue trends, top products, and loyalty charts.
- `money`: Dedicated workflow for categorized payments and debt collection.
- `export`: Excel download via backend pandas integration.

### Design System (Vanilla CSS)
- **Primary Color**: `#ea580c` (Orange/Amber gradient).
- **Standardized Icons**: All icons forced to 20px via `svg { width: 20px; height: 20px; }`.
- **Modern Receipt**: A specific interactive component that simulates a physical bill, featuring real-time calculation and "Share via WhatsApp" functionality.
- **Themes**: Full support for Light and Dark modes via `data-theme` attribute and CSS variables.

---

## 6. Backend API Endpoints

### Products
- `GET /products`: List all.
- `POST /products`: Create with uniqueness check.
- `PUT /products/{id}`: Update info or toggle active state.

### Customers
- `GET /customers`: List all with stats.
- `PUT /customers/{id}`: Update notes, contact, or category.
- `DELETE /customers/{id}`: Full cascade delete (Customer + All Orders).

### Orders
- `GET /orders`: List all with items.
- `POST /orders`: Create order + create associated items + generate summary text.
- `PUT /orders/{id}`: Update payment status (records `payment_date`) or customer details.
- `DELETE /orders/{id}`: Remove order.

### Utilities
- `GET /export?date=YYYY-MM-DD`: Generates and returns an `.xlsx` file using Pandas.

---

## 7. Operational Safety & Maintenance

### 3-Level Code Hardening (Audit Results)
1. **Types/Linting**: Strict TypeScript enforcement for all data types (Product, Order, Customer).
2. **Precision**: All financial calculations are rounded to 2 decimal places in the backend to prevent float errors.
3. **Robustness**: All API calls use `res.ok` checks and `try-catch` blocks with user-facing toast notifications.

### Database Setup
To ensure cascading deletes work in SQLite, the engine must listen for the connection and execute `PRAGMA foreign_keys=ON`.

---

## 8. Summary of Recent Fixes (2026-04-30)
- Fixed "White Screen" race condition by synchronizing `replace` calls.
- Resolved `Ctrl + Enter` shortcut failure after clicking repeat suggestions using a global listener.
- Implemented clickable "Repeat" tags to auto-fill data.
- Standardized all icons to 20px to fix UI alignment bugs.
