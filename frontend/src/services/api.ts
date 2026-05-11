import type { Product, Customer } from '../schema';

const API_BASE = `http://${window.location.hostname}:8000`;

export const api = {
  // --- PRODUCTS ---
  getProducts: () => fetch(`${API_BASE}/products`).then(res => res.json()),
  createProduct: (product: Partial<Product>) => 
    fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    }).then(res => res.json()),
  updateProduct: (id: number, product: Partial<Product>) => 
    fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    }).then(res => res.json()),

  // --- CUSTOMERS ---
  getCustomers: () => fetch(`${API_BASE}/customers`).then(res => res.json()),
  updateCustomer: (id: number, customer: Partial<Customer>) => 
    fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    }).then(res => res.json()),
  deleteCustomer: (id: number) => fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' }),

  // --- ORDERS ---
  getOrders: () => fetch(`${API_BASE}/orders`).then(res => res.json()),
  createOrder: (order: Record<string, unknown>) => 
    fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    }).then(res => res.json()),
  updateOrder: (id: number, order: Record<string, unknown>) => 
    fetch(`${API_BASE}/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    }).then(res => res.json()),
  deleteOrder: (id: number) => fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' }),
  cancelOrder: (id: number) => fetch(`${API_BASE}/orders/${id}/cancel`, { method: 'PUT' }).then(res => res.json()),
  approvePayment: (id: number) => fetch(`${API_BASE}/orders/${id}/approve-payment`, { method: 'PUT' }).then(res => res.json()),
  updateOrderStatus: (id: number, status: string, description?: string) => 
    fetch(`${API_BASE}/orders/${id}/status?status=${encodeURIComponent(status)}${description ? `&description=${encodeURIComponent(description)}` : ''}`, { method: 'PUT' }).then(res => res.json()),

  // --- MANUFACTURING & DELIVERY ---
  getMfgPending: (start: string, end: string) => 
    fetch(`${API_BASE}/manufacturing/pending?date_from=${start}&date_to=${end}T23:59:59`).then(res => res.json()),
  bulkDispatchMfg: (orderIds: number[]) => 
    fetch(`${API_BASE}/manufacturing/bulk-dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderIds)
    }).then(res => res.json()),
  bulkReadyDelivery: (orderIds: number[]) => 
    fetch(`${API_BASE}/manufacturing/bulk-ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderIds)
    }).then(res => res.json()),
  bulkDispatchDelivery: (orderIds: number[]) => 
    fetch(`${API_BASE}/delivery/bulk-dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderIds)
    }).then(res => res.json()),

  // --- EXPORT ---
  getExportUrl: (date: string) => `${API_BASE}/export?date=${date}`
};
