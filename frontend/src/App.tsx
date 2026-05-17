import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import type { Product, Order, Customer, OrderItem, Tab } from './schema';
import { api } from './services/api';
import { Icons } from './components/Icons';
import { SearchableAutocomplete, SortIcon, Toast, ConfirmModal } from './components/Common';
import { Timeline, VerticalTimeline } from './components/Timeline';
import { ManufacturingPacking, AnimatedPacking, ProductAnimation, AnimatedDelivery } from './components/Manufacturing';
import { getLocalDate, formatDisplayDate, toISODate, formatWeight } from './utils/formatters';

import { BottomNavigation } from './components/Navigation';
import { localDB } from './services/local-db';
import { syncService } from './services/sync';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  useEffect(() => {
    const initApp = async () => {
      await localDB.init();
      syncService.startAutoSync();
    };
    initApp();
  }, []);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Notifications & Modals
  const [toasts, setToasts] = useState<{id: number, message: string, type: 'success' | 'error'}[]>([]);
  const [confirmData, setConfirmData] = useState<{id: number, title: string, message: string} | null>(null);

  // Form State
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editingProdId, setEditingProdId] = useState<number | null>(null);
  const [tempProduct, setTempProduct] = useState<Product | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [analyticsRange, setAnalyticsRange] = useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [customRange, setCustomRange] = useState({ start: new Date().toLocaleDateString('en-CA'), end: new Date().toLocaleDateString('en-CA') });
  const [category, setCategory] = useState<'Retail' | 'Wholesale'>('Retail');
  const [weights, setWeights] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [productsData, ordersData, customersData] = await Promise.all([
        api.getProducts(),
        api.getOrders(),
        api.getCustomers()
      ]);
      setProducts(productsData);
      setOrders(ordersData);
      setCustomers(customersData);
      setLoading(false);
    } catch {
      addToast("Failed to connect to backend", "error");
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const selectedCustomer = useMemo(() =>
    customers.find(c => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()),
    [customers, customerName]
  );

  const frequentProducts = useMemo(() => {
    if (!selectedCustomer) return {};
    const lastOrder = orders
      .filter(o => o.customer_id === selectedCustomer.id && o.order_status !== 'Cancelled')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!lastOrder) return {};

    return Object.fromEntries(
      lastOrder.items.map(item => [item.product_id, item.weight])
    );
  }, [selectedCustomer, orders]);

  const handleProductClick = (productId: number) => {
    // If it's a frequent product, auto-fill it
    if (frequentProducts[productId] !== undefined) {
      handleWeightChange(productId, frequentProducts[productId].toString());
      addToast("Weight auto-filled from history");
    }
    // Always focus the input for better UX
    const input = document.getElementById(`weight-input-${productId}`);
    if (input) (input as HTMLInputElement).focus();
  };

  // Sorting and Filtering State
  const [orderSort, setOrderSort] = useState<{key: string, dir: 'asc' | 'desc'}>({key: 'date', dir: 'desc'});
  const [productSort, setProductSort] = useState<{key: string, dir: 'asc' | 'desc'}>({key: 'name', dir: 'asc'});
  const [customerSort, setCustomerSort] = useState<{key: string, dir: 'asc' | 'desc'}>({key: 'totalSpent', dir: 'desc'});
  const [orderFilter, setOrderFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  // New Product State
  const [newPName, setNewPName] = useState('');
  const [newPWPrice, setNewPWPrice] = useState('');
  const [newPRPrice, setNewPRPrice] = useState('');

  const [exportDate, setExportDate] = useState(getLocalDate());
  const [chronicleDate, setChronicleDate] = useState(getLocalDate());

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const triggerAutoFill = (name: string) => {
    const existing = customers.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      // Set category
      const cat = existing.category.charAt(0).toUpperCase() + existing.category.slice(1).toLowerCase();
      if (cat === 'Retail' || cat === 'Wholesale') setCategory(cat);

      // Auto-fill weights from last order immediately
      const lastOrder = orders
        .filter(o => o.customer_id === existing.id && o.order_status !== 'Cancelled')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (lastOrder) {
        const lastWeights: Record<number, string> = {};
        lastOrder.items.forEach(i => { lastWeights[i.product_id] = i.weight.toString(); });
        setWeights(lastWeights);
        addToast(`Restored last entry for ${existing.name}`);
      }
    }
  };

  const handleNameChange = (name: string) => {
    setCustomerName(name);
    // If name is cleared, clear weights
    if (name.trim() === '') {
      setWeights({});
    } else {
      // Try to auto-fill if a full match is typed
      triggerAutoFill(name);
    }
  };

  const handleWeightChange = (productId: number, val: string) => {
    setWeights(prev => ({ ...prev, [productId]: val }));
  };

  const getOrderItemsFromWeights = (): OrderItem[] => {
    return Object.entries(weights)
      .map(([idStr, weightStr]) => {
        const id = parseInt(idStr);
        const weight = parseFloat(weightStr);
        if (isNaN(weight) || weight <= 0) return null;
        const product = products.find(p => p.id === id);
        if (!product) return null;
        const rate = category === 'Wholesale' ? product.wholesale_price : product.retail_price;
        return { product_id: id, name: product.name, weight, price: rate * weight, rate };
      })
      .filter((item): item is OrderItem => item !== null);
  };

  const currentOrderItems = getOrderItemsFromWeights();
  const currentTotal = Math.round(currentOrderItems.reduce((sum, item) => sum + item.price, 0) * 100) / 100;

  const saveOrder = useCallback(async () => {
    if (!customerName || currentOrderItems.length === 0) return addToast("Details missing", "error");

    setSaving(true);
    try {
      const orderData = {
        customer_name: customerName,
        category,
        items: currentOrderItems.map(i => ({ product_id: i.product_id, weight: i.weight }))
      };

      const res = editingOrderId
        ? await api.updateOrder(editingOrderId, orderData)
        : await api.createOrder(orderData);

      if (res && !res.detail) {
        addToast(editingOrderId ? "Order updated!" : "Order saved!");
        resetForm();
        fetchData();
      } else {
        addToast(res?.detail || "Failed to save order", "error");
      }
    } catch {
      addToast("Network error while saving", "error");
    } finally { setSaving(false); }
  }, [customerName, currentOrderItems, editingOrderId, category, addToast, fetchData]);

  const resetForm = () => {
    setCustomerName('');
    setWeights({});
    setEditingOrderId(null);
    setCategory('Retail');
    // Focus back to customer name input
    setTimeout(() => {
      const input = document.getElementById('customer-name-input');
      if (input) input.focus();
    }, 100);
  };

  const startEditProduct = (p: Product) => {
    setEditingProdId(p.id);
    setTempProduct(p);
    setActiveTab('products');
  };

  const startEdit = (order: Order) => {
    setEditingOrderId(order.id);
    const c = customers.find(cus => cus.id === order.customer_id);
    setCustomerName(c?.name || '');
    setCategory((c?.category as 'Retail' | 'Wholesale') || 'Retail');
    const w: Record<number, string> = {};
    order.items.forEach(i => { w[i.product_id] = i.weight.toString(); });
    setWeights(w);
    setActiveTab('dashboard');
  };

  const deleteOrder = async (id: number) => {
    setConfirmData({ id, title: "Delete Order", message: "This will permanently remove this order from history." });
  };

  const deleteCustomer = async (id: number) => {
    const c = customers.find(cus => cus.id === id);
    setConfirmData({ id, title: "Delete Customer", message: `Delete "${c?.name}"? All associated orders will be deleted permanently.` });
  };

  const confirmDelete = async () => {
    if (!confirmData) return;
    if (confirmData.title === "Cancel Order") {
      await confirmCancelOrder(confirmData.id);
      setConfirmData(null);
      return;
    }
    const isCustomer = confirmData.title.includes("Customer");
    try {
      const res = isCustomer
        ? await api.deleteCustomer(confirmData.id)
        : await api.deleteOrder(confirmData.id);

      if (res.ok) {
        addToast(`${isCustomer ? 'Customer' : 'Order'} deleted`);
        fetchData();
        if (isCustomer && selectedCustomerId === confirmData.id) setSelectedCustomerId(null);
      } else {
        const err = await res.json().catch(() => ({ detail: "Deletion failed" }));
        addToast(err.detail || "Error during deletion", "error");
      }
    } catch {
      addToast("Network error during deletion", "error");
    }
    setConfirmData(null);
  };

  const deduplicateCustomers = async () => {
    const nameMap: Record<string, Customer[]> = {};
    customers.forEach(c => {
      const normalized = c.name.trim().toLowerCase();
      if (!nameMap[normalized]) nameMap[normalized] = [];
      nameMap[normalized].push(c);
    });

    let mergedCount = 0;
    try {
      for (const normalized in nameMap) {
        const dups = nameMap[normalized];
        if (dups.length > 1) {
          const primary = dups[0];
          const others = dups.slice(1);

          for (const other of others) {
            const otherOrders = orders.filter(o => o.customer_id === other.id);
            for (const o of otherOrders) {
              await api.updateOrder(o.id, { customer_name: primary.name });
            }
            await api.deleteCustomer(other.id);
            mergedCount++;
          }
        }
      }

      if (mergedCount > 0) {
        addToast(`Merged ${mergedCount} duplicate customers`);
        fetchData();
      } else {
        addToast("No duplicates found");
      }
    } catch (error) {
      console.error("Deduplication error:", error);
      addToast("Error during deduplication", "error");
      fetchData();
    }
  };

  const addProduct = async () => {
    if (!newPName) return;
    const existing = products.find(p => p.name.toLowerCase() === newPName.toLowerCase());
    if (existing) return addToast("Product with this name already exists", "error");

    try {
      const res = await api.createProduct({
        name: newPName,
        wholesale_price: parseFloat(newPWPrice) || 0,
        retail_price: parseFloat(newPRPrice) || 0,
        is_active: 1
      });
      if (res && !res.detail) {
        addToast("Product added");
        setNewPName(''); setNewPWPrice(''); setNewPRPrice('');
        fetchData();
      } else {
        addToast(res?.detail || "Failed to add product", "error");
      }
    } catch {
      addToast("Failed to add product", "error");
    }
  };

  const updateProduct = async (p: Product, updates: Partial<Product>) => {
    const updated = { ...p, ...updates };
    try {
      const res = await api.updateProduct(p.id, {
        name: updated.name,
        wholesale_price: updated.wholesale_price,
        retail_price: updated.retail_price,
        is_active: updated.is_active
      });
      if (res && !res.detail) {
        fetchData();
      } else {
        addToast(res?.detail || "Failed to update product", "error");
      }
    } catch {
      addToast("Network error while updating product", "error");
    }
  };

  const updatePaymentStatus = async (orderId: number, status: string) => {
    try {
      const res = await api.updateOrder(orderId, { payment_status: status });
      if (res && !res.detail) {
        addToast(status === 'Pending' ? "Payment undone" : `Marked as ${status}`);
        fetchData();
      } else {
        addToast(res?.detail || "Failed to update payment", "error");
      }
    } catch {
      addToast("Update failed due to network error", "error");
    }
  };

  const approvePayment = async (orderId: number) => {
    try {
      const res = await api.approvePayment(orderId);
      if (res && !res.detail) {
        addToast("Payment approved & finalized");
        fetchData();
      }
    } catch { addToast("Approval failed", "error"); }
  };

  useEffect(() => {
    if (orderFilter && activeTab !== 'manage' && activeTab !== 'history') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('manage');
    }
  }, [orderFilter, activeTab]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        saveOrder();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [saveOrder]);

  // --- ANALYTICS ---
  const analytics = useMemo(() => {
    const productSales: Record<string, number> = {};
    const customerLoyalty: Record<string, number> = {};
    const dailyData: Record<string, number> = {};

    orders.forEach(o => {
      const dateObj = new Date(o.date);
      if (isNaN(dateObj.getTime())) return;
      const dateKey = dateObj.toLocaleDateString('en-CA');
      dailyData[dateKey] = (dailyData[dateKey] || 0) + o.total_amount;
      const cName = (o.summary_text || '').split(' ->>')[0];
      customerLoyalty[cName] = (customerLoyalty[cName] || 0) + 1;
      o.items.forEach(item => {
        const p = products.find(p => p.id === item.product_id);
        if (p) productSales[p.name] = (productSales[p.name] || 0) + item.weight;
      });
    });
    const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topCustomers = Object.entries(customerLoyalty).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { topProducts, topCustomers, dailyData };
  }, [orders, products]);

  const chartData = useMemo(() => {
    const days = [];
    let count = 7;
    if (analyticsRange === 'day') count = 1;
    else if (analyticsRange === 'week') count = 7;
    else if (analyticsRange === 'month') count = 30;

    if (analyticsRange === 'custom') {
      const start = new Date(customRange.start);
      const end = new Date(customRange.end);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))) + 1;
      for (let i = 0; i < diffDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const dateStr = d.toLocaleDateString('en-CA');
        const total = analytics.dailyData[dateStr] || 0;
        days.push({ label, total, date: dateStr });
      }
    } else {
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString(undefined, count <= 7 ? { weekday: 'short' } : { month: 'short', day: 'numeric' });
        const dateStr = d.toLocaleDateString('en-CA');
        const total = analytics.dailyData[dateStr] || 0;
        days.push({ label, total, date: dateStr });
      }
    }
    return days;
  }, [analytics, analyticsRange, customRange]);

  const maxDaily = Math.max(...chartData.map(d => d.total), 1);
  const maxProductWeight = Math.max(...analytics.topProducts.map(p => p[1]), 1);

  const filteredExportOrders = useMemo(() => orders.filter(o => {
    const d = new Date(o.date).toISOString().split('T')[0];
    return d === exportDate;
  }).reverse(), [orders, exportDate]);

  const cashToday = useMemo(() => {
    const today = getLocalDate();
    return orders
      .filter(o => {
        if (!o.payment_date) return false;
        return toISODate(o.payment_date) === today && o.payment_status === 'Cash';
      })
      .sort((a, b) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime());
  }, [orders]);

  const upiToday = useMemo(() => {
    const today = getLocalDate();
    return orders
      .filter(o => {
        if (!o.payment_date) return false;
        return toISODate(o.payment_date) === today && o.payment_status === 'UPI';
      })
      .sort((a, b) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime());
  }, [orders]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);

  // --- MANUFACTURING STATE ---
  const [selectedMfgOrders, setSelectedMfgOrders] = useState<number[]>([]);
  const [selectedInMfgOrders, setSelectedInMfgOrders] = useState<number[]>([]);
  const [selectedDeliveryOrders, setSelectedDeliveryOrders] = useState<number[]>([]);
  const [showPendingPayments, setShowPendingPayments] = useState(true);

  const bulkDispatchMfg = async () => {
    if (selectedMfgOrders.length === 0) return;
    try {
      const res = await api.bulkDispatchMfg(selectedMfgOrders);
      if (res && !res.detail) {
        addToast(`Sent ${selectedMfgOrders.length} orders to Production!`);
        setSelectedMfgOrders([]);
        fetchData();
      }
    } catch { addToast("Dispatch failed", "error"); }
  };

  const cancelOrder = async (id: number) => {
    setConfirmData({ id, title: "Cancel Order", message: "Are you sure you want to cancel this order? This cannot be undone." });
  };

  const confirmCancelOrder = async (id: number) => {
    try {
      const res = await api.cancelOrder(id);
      if (res && !res.detail) {
        addToast("Order cancelled");
        fetchData();
      }
    } catch { addToast("Cancellation failed", "error"); }
  };

  const undoStatus = async (order: Order) => {
    const statusMap: Record<string, string> = {
      'In Manufacturing': 'Received',
      'Ready for Delivery': 'In Manufacturing',
      'Out for Delivery': 'Ready for Delivery',
      'Delivered': 'Out for Delivery'
    };
    const prevStatus = statusMap[order.order_status];
    if (prevStatus) {
      await updateStatus(order.id, prevStatus, `Status undone from ${order.order_status}`);
    }
  };

  const bulkReadyDelivery = async () => {
    if (selectedInMfgOrders.length === 0) return;
    try {
      const res = await api.bulkReadyDelivery(selectedInMfgOrders);
      if (res && !res.detail) {
        addToast(`Marked ${selectedInMfgOrders.length} orders as Ready!`);
        setSelectedInMfgOrders([]);
        fetchData();
      }
    } catch { addToast("Operation failed", "error"); }
  };

  const deliveredAndCash = async (orderId: number) => {
    try {
      // Atomic update for both status and payment via backend logic
      const res = await api.updateOrder(orderId, { payment_status: 'Cash' });
      if (res && !res.detail) {
        addToast("Delivered & Cash Collected!");
        fetchData();
      } else {
        addToast(res?.detail || "Operation failed", "error");
      }
    } catch { addToast("Operation failed", "error"); }
  };

  const shareToKeep = () => {
    const outOrders = orders.filter(o => o.order_status === 'Out for Delivery');
    if (outOrders.length === 0) {
      addToast("No orders on truck.");
      return;
    }

    const getSummary = (category: string) => {
      const rel = outOrders.filter(o => {
        const c = customers.find(x => x.id === o.customer_id);
        return c?.category?.toLowerCase() === category.toLowerCase();
      });
      const agg: Record<string, number> = {};
      rel.forEach(o => o.items.forEach(i => {
        const name = i.name || products.find(p => p.id === i.product_id)?.name || "Unknown";
        agg[name] = (agg[name] || 0) + i.weight;
      }));
      return Object.entries(agg).sort((a,b) => b[1]-a[1])
        .map(([name, w]) => `${name} (${formatWeight(w)}kg)`).join('\n');
    };

    const wholesaleStr = getSummary('Wholesale');
    const retailStr = getSummary('Retail');

    const ordersStr = outOrders.map(o => {
      const custName = (o.summary_text || '').split(' ->>')[0];
      let items = (o.summary_text || '').split('->>')[1] || ''?.trim() || '';
      // Remove any existing "Total = ..." from the items string to avoid duplication
      items = items.split(', Total =')[0];
      return `${o.id}${custName} ${items}, Total = ₹${o.total_amount}`;
    }).join('\n');

    const text = `OUT FOR DELIVERY\n\n*Wholesale Summary*\n${wholesaleStr || 'None'}\n\n*Retail Summary*\n${retailStr || 'None'}\n\n*Orders*\n${ordersStr}`;

    navigator.clipboard.writeText(text).then(() => {
      addToast("Data copied! Opening Keep...");
      setTimeout(() => window.open('https://keep.google.com/', '_blank'), 800);
    });
  };

  const updateStatus = async (order_id: number, status: string, description?: string) => {
    try {
      const res = await api.updateOrderStatus(order_id, status, description);
      if (res && !res.detail) {
        addToast(`Updated to ${status}`);
        fetchData();
      }
    } catch { addToast("Update failed", "error"); }
  };

  const bulkDispatchDelivery = async () => {
    try {
      const res = await api.bulkDispatchDelivery(selectedDeliveryOrders);
      if (res && !res.detail) {
        addToast("Dispatched for Delivery!");
        setSelectedDeliveryOrders([]);
        fetchData();
      }
    } catch { addToast("Dispatch failed", "error"); }
  };

  const paymentHistory = useMemo(() => {
    const received = orders.filter(o => (o.payment_status === 'Cash' || o.payment_status === 'UPI') && o.payment_date);
    const grouped: Record<string, { total: number, orders: Order[] }> = {};
    received.forEach(o => {
      if (!o.payment_date) return;
      const d = new Date(o.payment_date).toLocaleDateString('en-CA');
      if (!grouped[d]) grouped[d] = { total: 0, orders: [] };
      grouped[d].total += o.total_amount;
      grouped[d].orders.push(o);
    });
    return Object.entries(grouped).sort((a,b) => b[0].localeCompare(a[0]));
  }, [orders]);

  const filteredSortedOrders = useMemo(() => {
    let intermediateResult = [...orders];
    if (orderFilter) {
      const lowFilter = orderFilter.toLowerCase();
      intermediateResult = intermediateResult.filter(o =>
        (o.summary_text || '').toLowerCase().includes(lowFilter) ||
        o.id.toString().includes(lowFilter)
      );
    }
    if (statusFilter) {
      intermediateResult = intermediateResult.filter(o => o.order_status === statusFilter);
    }
    intermediateResult.sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      if (orderSort.key === 'customer') {
        aVal = (a.summary_text || '').split(' ->>')[0].toLowerCase();
        bVal = (b.summary_text || '').split(' ->>')[0].toLowerCase();
      } else if (orderSort.key === 'total_amount') {
        aVal = a.total_amount;
        bVal = b.total_amount;
      } else if (orderSort.key === 'date') {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      } else if (orderSort.key === 'id') {
        aVal = a.id;
        bVal = b.id;
      } else {
        aVal = (a as unknown as Record<string, string | number>)[orderSort.key] || '';
        bVal = (b as unknown as Record<string, string | number>)[orderSort.key] || '';
      }
      if (aVal < bVal) return orderSort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return orderSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return intermediateResult;
  }, [orders, orderFilter, orderSort, statusFilter]);

  const customerStats = useMemo(() => {
    const stats = customers.map(c => {
      const cOrders = orders.filter(o => o.customer_id === c.id);
      const totalSpent = cOrders.reduce((s, o) => s + o.total_amount, 0);
      const avgOrder = cOrders.length > 0 ? totalSpent / cOrders.length : 0;
      const lastOrder = cOrders.length > 0 ? cOrders.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : null;
      return { ...c, orderCount: cOrders.length, totalSpent, avgOrder, lastOrder };
    });
    const filtered = customerFilter ? stats.filter(c => c.name.toLowerCase().includes(customerFilter.toLowerCase()) || (c.phone && c.phone.includes(customerFilter))) : stats;
    return [...filtered].sort((a, b) => {
      const aVal = (a as Record<string, string | number>)[customerSort.key] || 0;
      const bVal = (b as Record<string, string | number>)[customerSort.key] || 0;
      if (aVal < bVal) return customerSort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return customerSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, orders, customerFilter, customerSort]);

  const productPerformance = useMemo(() => {
    const stats = products.map(p => {
      let totalWeight = 0;
      let totalRevenue = 0;
      const customerBuyCount: Record<string, number> = {};
      orders.forEach(o => {
        if (o.order_status === 'Cancelled') return;
        o.items.forEach(item => {
          if (item.product_id === p.id) {
            totalWeight += item.weight;
            // Use price or calculated_price if available
            totalRevenue += item.price || item.calculated_price || 0;
            const cName = (o.summary_text || '').split(' ->>')[0];
            customerBuyCount[cName] = (customerBuyCount[cName] || 0) + item.weight;
          }
        });
      });
      const entries = Object.entries(customerBuyCount).sort((a,b) => b[1] - a[1]);
      const topCustomer = entries[0];
      return { ...p, totalWeight, totalRevenue, topCustomerName: topCustomer ? topCustomer[0] : 'N/A', topCustomerWeight: topCustomer ? topCustomer[1] : 0 };
    });
    return [...stats].sort((a, b) => {
      const aVal = (a as Record<string, string | number>)[productSort.key] || 0;
      const bVal = (b as Record<string, string | number>)[productSort.key] || 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return productSort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (aVal < bVal) return productSort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return productSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, orders, productSort]);
  const chronicleData = useMemo(() => {
    const dayOrders = orders.filter(o => toISODate(o.date) === chronicleDate);
    const dayPayments = orders.filter(o => o.payment_date && toISODate(o.payment_date) === chronicleDate);
    const allLogs: {timestamp: string, type: string, message: string, orderId: number, customerName: string}[] = [];
    orders.forEach(o => {
      const cName = (o.summary_text || '').split(' ->>')[0];
      o.logs.forEach(l => {
        if (toISODate(l.timestamp) === chronicleDate) {
          allLogs.push({ timestamp: l.timestamp, type: l.status_reached, message: l.description || '', orderId: o.id, customerName: cName });
        }
      });
    });
    allLogs.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const totalMoney = dayPayments.reduce((sum, o) => sum + o.total_amount, 0);
    const newDebt = dayOrders.filter(o => o.payment_status === 'Debt').reduce((sum, o) => sum + o.total_amount, 0);
    const cancelled = dayOrders.filter(o => o.order_status === 'Cancelled');
    return { dayOrders, dayPayments, allLogs, totalMoney, newDebt, cancelled };
  }, [orders, chronicleDate]);

  if (loading) return <div className="loader">Initializing Viren's Khakhra System...</div>;

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="toast-container">{toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} />)}</div>
      {confirmData && <ConfirmModal title={confirmData.title} message={confirmData.message} onConfirm={confirmDelete} onCancel={() => setConfirmData(null)} />}
      <aside className={`sidebar no-print ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-glow">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {!sidebarCollapsed && <span className="brand-name">Viren's Khakhra</span>}
        </div>
        <nav className="sidebar-nav">
          <div className="nav-group">
            <div className="nav-label">{sidebarCollapsed ? 'M' : 'Main Menu'}</div>
            <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} title="Dashboard"><Icons.Dashboard /> {!sidebarCollapsed && 'Dashboard'}</button>
            <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')} title="Chronicle"><Icons.History /> {!sidebarCollapsed && 'Chronicle'}</button>
            <button className={`nav-item ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')} title="Manage Orders"><Icons.Orders /> {!sidebarCollapsed && 'Manage Orders'}</button>
          </div>
          <div className="nav-group">
            <div className="nav-label">{sidebarCollapsed ? 'B' : 'Business Intelligence'}</div>
            <button className={`nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')} title="Inventory Prices"><Icons.Products /> {!sidebarCollapsed && 'Inventory Prices'}</button>
            <button className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')} title="Customer CRM"><Icons.Users /> {!sidebarCollapsed && 'Customer CRM'}</button>
            <button className={`nav-item ${activeTab === 'product_analysis' ? 'active' : ''}`} onClick={() => setActiveTab('product_analysis')} title="Product Analytics"><Icons.Search /> {!sidebarCollapsed && 'Product Analytics'}</button>
            <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')} title="Sales Metrics"><Icons.Analytics /> {!sidebarCollapsed && 'Sales Metrics'}</button>
          </div>
          <div className="nav-group">
            <div className="nav-label">{sidebarCollapsed ? 'S' : 'Supply Chain'}</div>
            <button className={`nav-item ${activeTab === 'manufacturing' ? 'active' : ''}`} onClick={() => setActiveTab('manufacturing')} title="Manufacturing"><Icons.Manufacturing /> {!sidebarCollapsed && 'Manufacturing'}</button>
            <button className={`nav-item ${activeTab === 'delivery' ? 'active' : ''}`} onClick={() => setActiveTab('delivery')} title="Dispatch Center"><Icons.Delivery /> {!sidebarCollapsed && 'Dispatch Center'}</button>
            <button className={`nav-item ${activeTab === 'exp_1' ? 'active' : ''}`} onClick={() => setActiveTab('exp_1')} title="Logistics Pro"><Icons.Zap /> {!sidebarCollapsed && 'Logistics Pro'}</button>

            <button className={`nav-item ${activeTab === 'money' ? 'active' : ''}`} onClick={() => setActiveTab('money')} title="Ledger"><Icons.Money /> {!sidebarCollapsed && 'Ledger'}</button>
            <button className={`nav-item ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')} title="Data Export"><Icons.Export /> {!sidebarCollapsed && 'Data Export'}</button>
            <button className={`nav-item ${activeTab === 'recent_log' ? 'active' : ''}`} onClick={() => setActiveTab('recent_log')} title="Activity Feed"><Icons.History /> {!sidebarCollapsed && 'Activity Feed'}</button>
          </div>
        </nav>
        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme}>{theme === 'light' ? <Icons.Timer style={{transform: 'rotate(180deg)'}} /> : <Icons.Star />}</button>
          <div className="user-profile">
            <div className="user-avatar">VK</div>
            {!sidebarCollapsed && <div className="user-info"><span className="user-name">Viren Admin</span><span className="user-role">Owner</span></div>}
          </div>
        </div>
      </aside>

      <main className={`main-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="top-bar no-print">
          <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
            <button className="btn btn-secondary" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{padding: '0.6rem', borderRadius: '8px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Icons.Next style={{transform: sidebarCollapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.3s'}} />
            </button>
            <h1 className="page-title" style={{display: 'flex', alignItems: 'center', gap: '1.5rem', margin: 0}}>
              {activeTab === 'dashboard' && <><Icons.Dashboard style={{width: 32, height: 32, color: 'var(--accent)'}} /> Dashboard</>}
              {activeTab === 'history' && <><Icons.History style={{width: 32, height: 32, color: 'var(--accent)'}} /> Business Chronicle</>}
              {activeTab === 'manage' && <><Icons.Orders style={{width: 32, height: 32, color: 'var(--accent)'}} /> Order Management</>}
              {activeTab === 'products' && <><Icons.Products style={{width: 32, height: 32, color: 'var(--accent)'}} /> Inventory Prices</>}
              {activeTab === 'analytics' && <><Icons.Analytics style={{width: 32, height: 32, color: 'var(--accent)'}} /> Business Analytics</>}
              {activeTab === 'money' && <><Icons.Money style={{width: 32, height: 32, color: 'var(--accent)'}} /> Money Collection</>}
              {activeTab === 'customers' && <><Icons.Users style={{width: 32, height: 32, color: 'var(--accent)'}} /> Customer Profiles</>}
              {activeTab === 'product_analysis' && <><Icons.Search style={{width: 32, height: 32, color: 'var(--accent)'}} /> Product Performance</>}
              {activeTab === 'recent_log' && <><Icons.Timer style={{width: 32, height: 32, color: 'var(--accent)'}} /> Activity Feed</>}
              {activeTab === 'export' && <><Icons.Export style={{width: 32, height: 32, color: 'var(--accent)'}} /> Export & Preview</>}
              {activeTab === 'manufacturing' && <><Icons.Manufacturing style={{width: 32, height: 32, color: 'var(--accent)'}} /> Manufacturing</>}
              {activeTab === 'delivery' && <><Icons.Delivery style={{width: 32, height: 32, color: 'var(--accent)'}} /> Dispatch Center</>}
              {activeTab === 'exp_1' && <><Icons.Zap style={{width: 32, height: 32, color: 'var(--accent)'}} /> Express Logistics</>}
            </h1>
            <button 
              className={`btn btn-secondary ${loading ? 'anim-pulse' : ''}`} 
              onClick={() => { fetchData(); addToast("Syncing data..."); }} 
              style={{padding: '0.6rem', borderRadius: '8px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
              title="Refresh Data"
            >
              <Icons.Undo style={{width: 20, height: 20}} />
            </button>
          </div>
          <div className="search-header">
            <Icons.Search />
            <input 
              type="text" 
              className="header-search-input"
              placeholder="Search Orders..." 
              value={orderFilter} 
              onChange={(e) => setOrderFilter(e.target.value)} 
            />
          </div>
        </header>

        {activeTab === 'recent_log' && (
          <div className="recent-log-page" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            <div className="card">
              <h3 style={{marginTop: 0, marginBottom: '2rem'}}>Latest Activity Stream</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {orders.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20).map(o => (
                  <div key={o.id} className="collection-item" style={{background: 'var(--bg-main)', padding: '1.5rem', borderRadius: '16px', display: 'grid', gridTemplateColumns: '100px 1fr 150px 180px', alignItems: 'center', gap: '2rem'}}>
                    <div style={{fontWeight: 900, color: 'var(--text-muted)'}}>#{o.id}</div>
                    <div>
                      <div style={{fontWeight: 800, fontSize: '1.1rem'}}>{(o.summary_text || '').split(' ->>')[0]}</div>
                      <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>{(o.summary_text || '').split('->>')[1] || ''}</div>
                    </div>
                    <div style={{fontWeight: 900, fontSize: '1.2rem', color: 'var(--accent)', textAlign: 'right'}}>₹{o.total_amount.toLocaleString()}</div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end'}}>
                      <span className="badge" style={{background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '0.65rem'}}>{o.order_status.toUpperCase()}</span>
                      <div style={{fontSize: '0.7rem', fontWeight: 700}}>{formatDisplayDate(o.date)}</div>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <div style={{textAlign: 'center', padding: '5rem', color: 'var(--text-muted)'}}>No orders found in the database.</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="dashboard-grid">
            <div className="card no-print">
              <div className="form-container">
                <div style={{marginBottom: '2rem'}}>
                  <h3 style={{margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>{editingOrderId ? <Icons.Undo style={{width: 24, height: 24}} /> : <Icons.Add style={{width: 24, height: 24}} />} {editingOrderId ? 'Edit Order' : 'New Order Entry'}</h3>
                  <p style={{color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem'}}>Fill in the details below to create a fresh receipt.</p>
                </div>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '1.75rem'}}>
                  <div className="form-row" style={{display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1.5rem', alignItems: 'flex-end'}}>
                    <div className="input-group">
                      <label>CUSTOMER NAME</label>
                      <SearchableAutocomplete 
                        id="customer-name-input"
                        value={customerName} 
                        onChange={handleNameChange} 
                        onSelect={triggerAutoFill}
                        options={customers.map(c => c.name)} 
                        placeholder="Enter customer name..." 
                      />
                    </div>
                    <div className="input-group">
                      <label>CATEGORY</label>
                      <div className="toggle-group">
                        <button className={category === 'Retail' ? 'active' : ''} onClick={() => setCategory('Retail')}>Retail</button>
                        <button className={category === 'Wholesale' ? 'active' : ''} onClick={() => setCategory('Wholesale')}>Wholesale</button>
                      </div>
                    </div>
                  </div>

                  {selectedCustomer && (
                    <div className="customer-info-card" style={{background: 'var(--accent-soft)', borderLeft: '4px solid var(--accent)'}}>
                      <div className="info-header"><Icons.Dashboard /> CUSTOMER NOTES</div>
                      <div className="info-content">{selectedCustomer.notes}</div>
                    </div>
                  )}
                  <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <label style={{fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-muted)'}}>SELECT PRODUCTS</label>
                      {Object.keys(frequentProducts).length > 0 && <span className="badge" style={{background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '0.7rem'}}><Icons.Star style={{width: 14, height: 14}} /> REPEAT ORDERS AVAILABLE</span>}
                    </div>
                    <div className="product-grid" style={{marginTop: '1rem'}}>
                      {products.filter(p => p.is_active).map(p => {
                        const isFrequent = frequentProducts[p.id] !== undefined;
                        return (
                          <div key={p.id} className={`product-item ${weights[p.id] ? 'active' : ''} ${isFrequent ? 'frequent' : ''}`} onClick={() => handleProductClick(p.id)} style={{ cursor: 'pointer', position: 'relative' }}>
                            {isFrequent && <div className="frequent-tag"><Icons.Star style={{width: 10, height: 10}} /> Repeat</div>}
                            <ProductAnimation name={p.name} />
                            <div style={{fontWeight: 700, fontSize: '0.9rem'}}>{p.name}</div>
                            <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem'}}>₹{category === 'Wholesale' ? p.wholesale_price : p.retail_price}</div>
                            <div className="p-input-wrapper" onClick={e => e.stopPropagation()}><input id={`weight-input-${p.id}`} type="number" step="0.1" value={weights[p.id] || ''} onChange={e => handleWeightChange(p.id, e.target.value)} placeholder="0.0" /></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modern-receipt" style={{padding: currentOrderItems.length === 0 ? '2rem' : '0'}}>
              {currentOrderItems.length === 0 ? (
                <div style={{textAlign: 'center', color: 'var(--text-muted)'}}>
                  <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}><Icons.Orders style={{width: 48, height: 48, margin: '0 auto'}} /></div>
                  <h4 style={{margin: 0}}>Receipt Placeholder</h4>
                  <p style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>Select products to build the bill.</p>
                </div>
              ) : (
                <>
                  <div className="receipt-header"><h2><Icons.Bag style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '10px'}} /> VIREN'S KHAKHRA</h2><div style={{fontSize: '0.8rem', opacity: 0.8}}>{editingOrderId ? 'MODIFIED' : 'NEW'} ORDER RECEIPT</div></div>
                  <div className="receipt-body">
                    <div className="receipt-meta"><div><strong>Client:</strong><br/>{customerName || '---'}</div><div style={{textAlign: 'right'}}><strong>Date:</strong><br/>{formatDisplayDate(new Date())}</div></div>
                    <table className="receipt-table">
                      <thead><tr><th>Item</th><th style={{textAlign: 'right'}}>Qty</th><th style={{textAlign: 'right'}}>Total</th></tr></thead>
                      <tbody>{currentOrderItems.map(i => (<tr key={i.product_id}><td>{i.name}<br/><small>@ ₹{i.rate}</small></td><td style={{textAlign: 'right'}}>{formatWeight(i.weight)} kg</td><td style={{textAlign: 'right'}}>₹{i.price.toFixed(2)}</td></tr>))}</tbody>
                    </table>
                    <div className="receipt-total"><span>TOTAL DUE</span><span>₹{currentTotal.toFixed(2)}</span></div>
                  </div>
                  <div className="receipt-actions no-print">
                    <button className="btn btn-primary" onClick={saveOrder} disabled={saving}>{saving ? 'Saving...' : 'SAVE ORDER'}</button>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem'}}>
                      <button className="btn btn-secondary" onClick={() => window.print()}>PRINT</button>
                      <button className="btn btn-secondary" onClick={() => { navigator.clipboard.writeText(`*Viren's Khakhra Order*\n*Name:* ${customerName}\n*Total:* ₹${currentTotal}`); addToast("Copied to clipboard"); }}>WHATSAPP</button>
                    </div>
                  </div>
                </>
              )}

              {/* RECENT ENTRIES SECTION */}
              <div className="card no-print" style={{marginTop: '1.5rem', padding: '1rem', background: 'rgba(var(--accent-rgb), 0.03)', border: '1px dashed var(--border)'}}>
                <h4 style={{margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.05em'}}>
                  <Icons.History style={{width: 14, height: 14}} /> LATEST ENTRIES
                </h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  {orders.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(o => (
                    <div key={o.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.75rem'}}>
                      <div style={{display: 'flex', flexDirection: 'column'}}>
                        <span style={{fontWeight: 800, color: 'var(--text-main)'}}>{(o.summary_text || '').split(' ->>')[0]}</span>
                        <span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>{formatDisplayDate(o.date)}</span>
                      </div>
                      <div style={{fontWeight: 900, color: 'var(--accent)', fontSize: '0.85rem'}}>₹{(o.total_amount || 0).toLocaleString()}</div>
                    </div>
                  ))}
                  {orders.length === 0 && <div style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '1rem'}}>No recent entries.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="chronicle-page" style={{display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem'}}>
            <div className="chronicle-sidebar"><div className="card" style={{padding: '1rem', height: 'calc(100vh - 180px)', overflowY: 'auto', position: 'sticky', top: '100px'}}><h3 style={{fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem'}}>Select Date</h3><div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>{Array.from(new Set(orders.map(o => toISODate(o.date)))).sort().reverse().map(date => (<button key={date} className={`btn ${chronicleDate === date ? 'btn-primary' : 'btn-secondary'}`} style={{textAlign: 'left', justifyContent: 'flex-start', fontSize: '0.85rem', padding: '0.75rem 1rem'}} onClick={() => setChronicleDate(date)}>{formatDisplayDate(date)}</button>))}</div></div></div>
            <div className="chronicle-content" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
              <div className="chronicle-hero-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem'}}><div className="card" style={{borderTop: '5px solid var(--accent)', textAlign: 'center', padding: '1.5rem'}}><div style={{marginBottom: '0.5rem'}}><Icons.Orders style={{width: 32, height: 32, color: 'var(--accent)', margin: '0 auto'}} /></div><div style={{fontSize: '1.5rem', fontWeight: 900}}>{chronicleData.dayOrders.length}</div><div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Orders Received</div></div><div className="card" style={{borderTop: '5px solid var(--success)', textAlign: 'center', padding: '1.5rem'}}><div style={{marginBottom: '0.5rem'}}><Icons.Money style={{width: 32, height: 32, color: 'var(--success)', margin: '0 auto'}} /></div><div style={{fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)'}}>₹{chronicleData.totalMoney.toLocaleString()}</div><div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Money Collected</div></div><div className="card" style={{borderTop: '5px solid var(--danger)', textAlign: 'center', padding: '1.5rem'}}><div style={{marginBottom: '0.5rem'}}><Icons.Alert style={{width: 32, height: 32, color: 'var(--danger)', margin: '0 auto'}} /></div><div style={{fontSize: '1.5rem', fontWeight: 900, color: 'var(--danger)'}}>₹{chronicleData.newDebt.toLocaleString()}</div><div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>New Debt Accrued</div></div></div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', alignItems: 'start'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                  <div className="card">
                    <h3 style={{marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem'}}>
                      <Icons.Orders style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}} /> Orders Received Today
                    </h3>
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead><tr><th>ID</th><th>Customer</th><th>Items</th><th style={{textAlign: 'right'}}>Amount</th></tr></thead>
                        <tbody>
                          {chronicleData.dayOrders.map(o => (
                            <tr key={o.id}>
                              <td>#{o.id}</td>
                              <td style={{fontWeight: 700}}>{(o.summary_text || '').split(' ->>')[0]}</td>
                              <td style={{fontSize: '0.8rem', maxWidth: '300px'}}>{(o.summary_text || '').split('->>')[1] || ''}</td>
                              <td style={{textAlign: 'right', fontWeight: 800}}>₹{o.total_amount}</td>
                            </tr>
                          ))}
                          {chronicleData.dayOrders.length === 0 && <tr><td colSpan={4} style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No orders placed on this day.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                    <div className="card" style={{background: 'var(--success-soft)', padding: '1.25rem', border: '1px solid var(--success-soft)'}}>
                      <h3 style={{marginTop: 0, fontSize: '1rem', color: 'var(--success)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span><Icons.Money style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}} /> Cash Payments</span>
                        <span style={{fontSize: '1.1rem', fontWeight: 900}}>₹{chronicleData.dayPayments.filter(o => o.payment_status === 'Cash').reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}</span>
                      </h3>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.6rem'}}>
                        {chronicleData.dayPayments.filter(o => o.payment_status === 'Cash').sort((a,b) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime()).map(o => (
                          <div key={o.id} style={{fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border)'}}>
                            <div>
                              <div style={{fontWeight: 800}}>{(o.summary_text || '').split(' ->>')[0]}</div>
                              <div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>
                                {o.payment_date ? new Date(o.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'} • #{o.id}
                              </div>
                            </div>
                            <span style={{fontWeight: 800, color: 'var(--success)', alignSelf: 'center'}}>₹{o.total_amount}</span>
                          </div>
                        ))}
                        {chronicleData.dayPayments.filter(o => o.payment_status === 'Cash').length === 0 && <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem'}}>No cash payments.</div>}
                      </div>
                    </div>

                    <div className="card" style={{background: 'var(--accent-soft)', padding: '1.25rem', border: '1px solid var(--accent-soft)'}}>
                      <h3 style={{marginTop: 0, fontSize: '1rem', color: 'var(--accent)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span><Icons.Zap style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}} /> UPI Payments</span>
                        <span style={{fontSize: '1.1rem', fontWeight: 900}}>₹{chronicleData.dayPayments.filter(o => o.payment_status === 'UPI').reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}</span>
                      </h3>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.6rem'}}>
                        {chronicleData.dayPayments.filter(o => o.payment_status === 'UPI').sort((a,b) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime()).map(o => (
                          <div key={o.id} style={{fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border)'}}>
                            <div>
                              <div style={{fontWeight: 800}}>{(o.summary_text || '').split(' ->>')[0]}</div>
                              <div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>
                                {o.payment_date ? new Date(o.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'} • #{o.id}
                              </div>
                            </div>
                            <span style={{fontWeight: 800, color: 'var(--accent)', alignSelf: 'center'}}>₹{o.total_amount}</span>
                          </div>
                        ))}
                        {chronicleData.dayPayments.filter(o => o.payment_status === 'UPI').length === 0 && <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem'}}>No UPI payments.</div>}
                      </div>
                    </div>

                    <div className="card" style={{background: 'rgba(239, 68, 68, 0.05)', padding: '1.25rem', gridColumn: 'span 2'}}>
                      <h3 style={{marginTop: 0, fontSize: '1rem', color: 'var(--danger)', marginBottom: '1.25rem'}}><Icons.Ban style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}} /> Cancellations Today</h3>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem'}}>
                        {chronicleData.cancelled.map(o => (
                          <div key={o.id} style={{fontSize: '0.8rem', display: 'flex', gap: '0.8rem', padding: '0.5rem 1rem', background: 'var(--card-bg)', borderRadius: '80px', border: '1px solid var(--border)', alignItems: 'center'}}>
                            <span style={{fontWeight: 700}}>{(o.summary_text || '').split(' ->>')[0]}</span>
                            <span style={{opacity: 0.6}}>|</span>
                            <span style={{fontWeight: 800, color: 'var(--danger)'}}>₹{o.total_amount}</span>
                          </div>
                        ))}
                        {chronicleData.cancelled.length === 0 && <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>No cancellations today.</div>}
                      </div>
                    </div>
                  </div>
                </div>
<div className="card" style={{padding: '1.5rem'}}><h3 style={{marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Icons.History /> Master System Log</h3><div className="vertical-log-timeline" style={{maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem'}}>{chronicleData.allLogs.map((log, idx) => { const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); const getEmoji = (type: string) => {
                                  const style = { width: 14, height: 14 };
                                  if (type === 'Received') return <Icons.Orders style={style} />;
                                  if (type === 'In Manufacturing') return <Icons.Flame style={style} />;
                                  if (type === 'Ready for Delivery') return <Icons.Bag style={style} />;
                                  if (type === 'Out for Delivery') return <Icons.Delivery style={style} />;
                                  if (type === 'Delivered') return <Icons.CheckCircle style={style} />;
                                  if (type === 'Cancelled') return <Icons.Ban style={style} />;
                                  if (type === 'Paid') return <Icons.Money style={style} />;
                                  if (type === 'Debt') return <Icons.Alert style={style} />;
                                  return <Icons.History style={style} />;
                                }; return (<div key={idx} className="log-entry-v active" style={{marginBottom: '1.5rem'}}><div className="log-visual-v"><div className="log-dot-v">{getEmoji(log.type)}</div>{idx < chronicleData.allLogs.length - 1 && <div className="log-connector-v"></div>}</div><div className="log-content-v"><div className="log-header-v"><span className="log-status-text-v" style={{fontSize: '0.9rem'}}>{log.customerName}</span><span className="log-time-text-v">{timeStr}</span></div><div className="log-desc-text-v" style={{fontSize: '0.8rem', marginTop: '0.1rem'}}>{log.type}: {log.message}</div></div></div>); })}{chronicleData.allLogs.length === 0 && (<div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem'}}>No system logs for this date.</div>)}</div></div></div>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            {viewingOrderId ? (() => {
              const order = orders.find(o => o.id === viewingOrderId);
              if (!order) return <div className="card">Order not found.</div>;
              const customer = customers.find(c => c.id === order.customer_id);
              
              return (
                <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <button className="btn btn-secondary" onClick={() => setViewingOrderId(null)} style={{width: 'fit-content', borderRadius: '100px'}}>← Back to Order List</button>
                    <div style={{display: 'flex', gap: '1rem'}}>
                      <button className="btn btn-primary" onClick={() => { startEdit(order); setViewingOrderId(null); }}>EDIT ORDER</button>
                      <button className="btn btn-secondary" onClick={() => window.print()}>PRINT RECEIPT</button>
                    </div>
                  </div>

                  <div className="card" style={{display: 'grid', gridTemplateColumns: '1fr 350px', gap: '3rem'}}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '2.5rem'}}>
                        <div>
                          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem'}}>
                            <h2 style={{margin: 0, fontSize: '2rem', fontWeight: 900}}>Order #{order.id}</h2>
                            <span className="badge" style={{
                              background: order.order_status === 'Delivered' ? 'var(--success)' : 
                                          order.order_status === 'Cancelled' ? 'var(--danger)' : 'var(--accent-soft)', 
                              color: (order.order_status === 'Delivered' || order.order_status === 'Cancelled') ? 'white' : 'var(--accent)', 
                              fontSize: '0.8rem', 
                              padding: '0.4rem 0.8rem',
                              fontWeight: 800
                            }}>
                              {order.order_status.toUpperCase()}
                            </span>
                          </div>
                          <p style={{color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0}}>Placed on {formatDisplayDate(order.date)}</p>
                        </div>

                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
                        <div>
                          <h4 style={{margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.1em'}}>CUSTOMER DETAILS</h4>
                          <div style={{fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem'}}>{customer?.name || 'Unknown'}</div>
                          <div style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>
                            <Icons.Phone style={{width: 14, height: 14, verticalAlign: 'middle', marginRight: '5px'}} /> {customer?.phone || 'No Phone'}<br/>
                            <Icons.MapPin style={{width: 14, height: 14, verticalAlign: 'middle', marginRight: '5px', marginTop: '5px'}} /> {customer?.address || 'No Address'}
                          </div>
                        </div>
                        <div>
                          <h4 style={{margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.1em'}}>PAYMENT STATUS</h4>
                          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem'}}>
                            <div style={{
                              fontSize: '1.5rem', 
                              fontWeight: 900, 
                              color: order.payment_status === 'Debt' ? 'var(--danger)' : 
                                     order.payment_status === 'Pending' ? 'var(--text-muted)' : 'var(--success)'
                            }}>
                              ₹{order.total_amount.toLocaleString()}
                            </div>
                            <span className="badge" style={{
                              background: order.payment_status === 'Pending' ? 'var(--bg-main)' : 
                                          order.payment_status === 'Debt' ? 'var(--danger-soft)' : 
                                          order.payment_status === 'UPI' ? 'var(--accent-soft)' : 'var(--success-soft)', 
                              color: order.payment_status === 'Pending' ? 'var(--text-muted)' : 
                                     order.payment_status === 'Debt' ? 'var(--danger)' : 
                                     order.payment_status === 'UPI' ? 'var(--accent)' : 'var(--success)',
                              fontWeight: 900
                            }}>
                              {order.payment_status.toUpperCase()}
                            </span>
                          </div>
                          
                          {order.payment_status === 'Pending' && (
                            <div style={{display: 'flex', gap: '0.75rem', marginBottom: '1.5rem'}}>
                              <button className="btn btn-success-outline" style={{flex: 1, padding: '0.75rem', fontWeight: 800}} onClick={() => updatePaymentStatus(order.id, 'Cash')}>
                                <Icons.Money /> CASH
                              </button>
                              <button className="btn btn-accent-outline" style={{flex: 1, padding: '0.75rem', fontWeight: 800}} onClick={() => updatePaymentStatus(order.id, 'UPI')}>
                                <Icons.Zap /> UPI
                              </button>
                              <button className="btn btn-danger-outline" style={{flex: 1, padding: '0.75rem', fontWeight: 800}} onClick={() => updatePaymentStatus(order.id, 'Debt')}>
                                <Icons.Alert /> DEBT
                              </button>
                            </div>
                          )}

                          {order.payment_status === 'Debt' && (
                             <div style={{display: 'flex', gap: '0.75rem', marginBottom: '1.5rem'}}>
                               <button className="btn btn-success-outline" style={{flex: 1, padding: '0.75rem', fontWeight: 800}} onClick={() => updatePaymentStatus(order.id, 'Cash')}>
                                 <Icons.Money /> SETTLE CASH
                               </button>
                               <button className="btn btn-accent-outline" style={{flex: 1, padding: '0.75rem', fontWeight: 800}} onClick={() => updatePaymentStatus(order.id, 'UPI')}>
                                 <Icons.Zap /> SETTLE UPI
                               </button>
                             </div>
                          )}

                          {order.order_status !== 'Delivered' && order.order_status !== 'Cancelled' && (
                            <button className="btn btn-primary" style={{width: '100%', padding: '0.75rem', fontWeight: 800, background: 'var(--success)', marginBottom: '1.5rem'}} onClick={() => updateStatus(order.id, 'Delivered', 'Manually marked as Delivered')}>
                              MARK AS DELIVERED ✓
                            </button>
                          )}

                          {order.payment_date && <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)'}}>Settled on {formatDisplayDate(order.payment_date)}</div>}
                        </div>
                      </div>

                      <div className="table-responsive" style={{marginTop: '1rem'}}>
                        <h4 style={{margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.1em'}}>ORDER ITEMS</h4>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th style={{textAlign: 'right'}}>Rate</th>
                              <th style={{textAlign: 'right'}}>Weight</th>
                              <th style={{textAlign: 'right'}}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{fontWeight: 700}}>{item.name || products.find(p => p.id === item.product_id)?.name || 'Unknown'}</td>
                                <td style={{textAlign: 'right'}}>₹{item.rate}</td>
                                <td style={{textAlign: 'right'}}>{formatWeight(item.weight)} kg</td>
                                <td style={{textAlign: 'right', fontWeight: 800}}>₹{(item.price || item.calculated_price || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={3} style={{textAlign: 'right', fontWeight: 700, padding: '1.5rem'}}>GRAND TOTAL</td>
                              <td style={{textAlign: 'right', fontWeight: 900, fontSize: '1.2rem', color: 'var(--accent)', padding: '1.5rem'}}>₹{(order.total_amount || 0).toLocaleString()}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    <div style={{borderLeft: '1px solid var(--border)', paddingLeft: '3rem'}}>
                      <h4 style={{margin: '0 0 2rem 0', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.1em'}}>ACTIVITY TIMELINE</h4>
                      <VerticalTimeline order={order} />
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="manage-orders-container" style={{display: 'flex', flexDirection: 'column', gap: '2.5rem'}}>
                <div className="status-summary-bar">
                  {[
                    { label: 'Received', status: 'Received', color: '#64748b', icon: <Icons.Orders />, count: orders.filter(o => o.order_status === 'Received').length },
                    { label: 'Baking', status: 'In Manufacturing', color: '#f59e0b', icon: <Icons.Flame />, count: orders.filter(o => o.order_status === 'In Manufacturing').length },
                    { label: 'Packed', status: 'Ready for Delivery', color: '#10b981', icon: <Icons.Bag />, count: orders.filter(o => o.order_status === 'Ready for Delivery').length },
                    { label: 'Shipping', status: 'Out for Delivery', color: '#4f46e5', icon: <Icons.Delivery />, count: orders.filter(o => o.order_status === 'Out for Delivery').length },
                    { label: 'Delivered', status: 'Delivered', color: '#059669', icon: <Icons.Check />, count: orders.filter(o => o.order_status === 'Delivered').length }
                  ].map(s => (
                    <div 
                      key={s.label} 
                      className={`status-mini-card ${statusFilter === s.status ? 'active' : ''}`}
                      onClick={() => setStatusFilter(statusFilter === s.status ? null : s.status)}
                      style={{cursor: 'pointer'}}
                    >
                      <div className="status-mini-icon" style={{background: `${s.color}20`, color: s.color}}>
                        {s.icon}
                      </div>
                      <div className="status-mini-info">
                        <span className="status-mini-label">{s.label}</span>
                        <span className="status-mini-value">{s.count}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card" style={{padding: 0, overflow: 'hidden'}}>
                  <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)'}}>
                    <div className="search-header" style={{width: '100%', margin: 0}}>
                      <Icons.Search />
                      <input
                        type="text"
                        className="header-search-input"
                        placeholder="Search by Customer Name, Order ID, or Items..."
                        value={orderFilter}
                        onChange={(e) => setOrderFilter(e.target.value)}
                      />
                    </div>
                  </div>
                  <table className="modern-table">
                  <thead><tr><th className="sortable-header" onClick={() => setOrderSort({key: 'id', dir: orderSort.key === 'id' && orderSort.dir === 'asc' ? 'desc' : 'asc'})}>ID <SortIcon active={orderSort.key === 'id'} direction={orderSort.dir} /></th><th className="sortable-header" onClick={() => setOrderSort({key: 'date', dir: orderSort.key === 'date' && orderSort.dir === 'asc' ? 'desc' : 'asc'})}>Date <SortIcon active={orderSort.key === 'date'} direction={orderSort.dir} /></th><th className="sortable-header" onClick={() => setOrderSort({key: 'customer', dir: orderSort.key === 'customer' && orderSort.dir === 'asc' ? 'desc' : 'asc'})}>Customer <SortIcon active={orderSort.key === 'customer'} direction={orderSort.dir} /></th><th className="sortable-header" onClick={() => setOrderSort({key: 'total_amount', dir: orderSort.key === 'total_amount' && orderSort.dir === 'asc' ? 'desc' : 'asc'})}>Amount <SortIcon active={orderSort.key === 'total_amount'} direction={orderSort.dir} /></th><th style={{minWidth: '320px'}}>Order Status Timeline</th><th className="no-print">Actions</th></tr></thead>
                  <tbody>{filteredSortedOrders.map(o => (
                    <tr key={o.id} className={o.order_status === 'Cancelled' ? 'order-cancelled' : ''} onClick={() => setViewingOrderId(o.id)} style={{cursor: 'pointer'}}>
                      <td style={{position: 'relative'}}>
                        <span style={{fontWeight: 900, color: 'var(--text-muted)'}}>#{o.id}</span>
                        {o.order_status === 'Cancelled' && <div className="cancelled-stamp">CANCELLED</div>}
                      </td>
                      <td>{formatDisplayDate(o.date)}</td>
                      <td>
                        <div style={{fontWeight: 800}}>{(o.summary_text || '').split(' ->>')[0]}</div>
                        <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                          {(o.summary_text || '').split('->>')[1] || ''}
                        </div>
                      </td>
                      <td style={{fontWeight: 800, color: 'var(--accent)'}}>₹{(o.total_amount || 0).toLocaleString()}</td>
                      <td><Timeline order={o} /></td>
                      <td className="no-print">
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                          <button className="btn btn-secondary" style={{padding: '0.5rem', borderRadius: '8px'}} title="Edit Order" onClick={(e) => { e.stopPropagation(); startEdit(o); }}>
                            <Icons.Edit style={{width: 16, height: 16}} />
                          </button>
                          {o.order_status !== 'Cancelled' && o.order_status !== 'Received' && (
                            <button className="btn btn-secondary" style={{padding: '0.5rem', borderRadius: '8px', color: 'var(--accent)'}} title="Undo Status" onClick={(e) => { e.stopPropagation(); undoStatus(o); }}>
                              <Icons.Undo style={{width: 16, height: 16}} />
                            </button>
                          )}
                          {o.order_status !== 'Cancelled' && o.order_status !== 'Delivered' && (
                            <button className="btn btn-danger-outline" style={{padding: '0.5rem', borderRadius: '8px'}} title="Cancel Order" onClick={(e) => { e.stopPropagation(); cancelOrder(o.id); }}>
                              <Icons.Cancel style={{width: 16, height: 16}} />
                            </button>
                          )}
                          <button className="btn btn-secondary" style={{padding: '0.5rem', borderRadius: '8px', color: 'var(--text-muted)'}} title="Delete Permanently" onClick={(e) => { e.stopPropagation(); deleteOrder(o.id); }}>
                            <Icons.Delete style={{width: 16, height: 16}} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manufacturing' && (() => {
          const filteredMfgOrders = orders.filter(o => o.order_status === 'Received');

          return (
            <div className="manufacturing-page" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
              <div className="card"><div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}><div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}><div style={{width: 60, height: 60}}><AnimatedPacking /></div><div><h3 style={{margin: 0}}>Production Aggregator</h3><p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Showing all pending orders ready for production.</p></div></div><div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}><button className="btn btn-primary" style={{height: '48px'}} onClick={bulkDispatchMfg} disabled={selectedMfgOrders.length === 0}>SEND {selectedMfgOrders.length} SELECTED TO PRODUCTION</button></div></div></div>
              <ManufacturingPacking orders={filteredMfgOrders} customers={customers} products={products} />
              {['Wholesale', 'Retail'].map(cat => { 
                const catOrders = filteredMfgOrders.filter(o => {
                  const cust = customers.find(c => c.id === o.customer_id);
                  return cust?.category?.toLowerCase() === cat.toLowerCase();
                }); 
                return (
                  <div key={cat} className="category-section">
                    <div className={`category-header ${cat.toLowerCase()}`}>{cat} ORDERS <span>{catOrders.length} Pending</span></div>
                    <div className="selection-bar">
                      <button className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.75rem'}} onClick={() => { const ids = catOrders.map(o => o.id); setSelectedMfgOrders(prev => Array.from(new Set([...prev, ...ids]))); }}>Select All {cat}</button>
                      <button className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.75rem'}} onClick={() => { const ids = catOrders.map(o => o.id); setSelectedMfgOrders(prev => prev.filter(id => !ids.includes(id))); }}>Deselect All {cat}</button>
                    </div>
                    <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                      {catOrders.map(o => (
                        <div key={o.id} className="collection-item" style={{padding: '1rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer'}} onClick={() => { if (selectedMfgOrders.includes(o.id)) setSelectedMfgOrders(p => p.filter(id => id !== o.id)); else setSelectedMfgOrders(p => [...p, o.id]); }}>
                          <input type="checkbox" style={{width: '20px', height: '20px', cursor: 'pointer'}} checked={selectedMfgOrders.includes(o.id)} onChange={() => {}} />
                          <div style={{flex: 1}}>
                                                      <div style={{fontWeight: 800}}>
                                                        {(o.summary_text || '').split(' ->>')[0]}
                                                        {o.logs.some(l => l.description?.includes('Delivery Failed')) && (
                                                          <span className="badge" style={{background: 'var(--danger)', color: 'white', marginLeft: '1rem', fontSize: '0.6rem'}}><Icons.Alert style={{width: 10, height: 10}} /> PREVIOUS ORDER DUE</span>
                                                        )}
                                                      </div>
                                                      <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>ID: #{o.id} • {(o.summary_text || '').split('->>')[1] || ''}</div>
                                                    </div>

                        </div>
                      ))}
                    </div>
                  </div>
                ); 
              })}
              <div className="card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                  <h3 style={{margin: 0}}>In Manufacturing <Icons.Flame style={{display: 'inline-block', verticalAlign: 'middle', color: 'var(--accent)'}} /></h3>
                  <div style={{display: 'flex', gap: '1rem'}}>
                    <button className="btn btn-secondary" onClick={() => {
                      const inMfg = orders.filter(o => o.order_status === 'In Manufacturing').map(o => o.id);
                      setSelectedInMfgOrders(prev => prev.length === inMfg.length ? [] : inMfg);
                    }}>{selectedInMfgOrders.length === orders.filter(o => o.order_status === 'In Manufacturing').length ? 'Deselect All' : 'Select All'}</button>
                    <button className="btn btn-primary" onClick={bulkReadyDelivery} disabled={selectedInMfgOrders.length === 0}>
                      MARK {selectedInMfgOrders.length} SELECTED AS READY
                    </button>
                  </div>
                </div>
                
                {selectedInMfgOrders.length > 0 && (
                  <div style={{marginBottom: '2rem'}}>
                    <ManufacturingPacking orders={orders.filter(o => selectedInMfgOrders.includes(o.id))} customers={customers} products={products} />
                  </div>
                )}

                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  {orders.filter(o => o.order_status === 'In Manufacturing').map(o => (
                    <div key={o.id} className="collection-item" style={{background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'}} onClick={() => {
                      if (selectedInMfgOrders.includes(o.id)) setSelectedInMfgOrders(p => p.filter(id => id !== o.id));
                      else setSelectedInMfgOrders(p => [...p, o.id]);
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
                        <input type="checkbox" style={{width: '20px', height: '20px', cursor: 'pointer'}} checked={selectedInMfgOrders.includes(o.id)} onChange={() => {}} />
                        <div>
                          <div style={{fontWeight: 800}}>{(o.summary_text || '').split(' ->>')[0]}</div>
                          <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{(o.summary_text || '').split('->>')[1] || ''}</div>
                        </div>
                      </div>
                      <div style={{display: 'flex', gap: '1rem'}}>
                        <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); undoStatus(o); }}>UNDO</button>
                        <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); updateStatus(o.id, 'Ready for Delivery'); }}>READY FOR DELIVERY</button>
                      </div>
                    </div>
                  ))}
                  {orders.filter(o => o.order_status === 'In Manufacturing').length === 0 && (
                    <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>No orders currently in manufacturing.</div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'delivery' && (
          <div className="delivery-page" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            <div className="card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                <h3 style={{margin: 0}}>Ready for Dispatch</h3>
                <button className="btn btn-primary" style={{background: '#4f46e5'}} disabled={selectedDeliveryOrders.length === 0} onClick={bulkDispatchDelivery}>
                  DISPATCH {selectedDeliveryOrders.length} SELECTED ORDERS
                </button>
              </div>

              {/* Added summaries here */}
              <div style={{marginBottom: '2rem'}}>
                <ManufacturingPacking 
                  orders={orders.filter(o => o.order_status === 'Ready for Delivery')} 
                  customers={customers} 
                  products={products} 
                />
              </div>

              <div className="selection-bar" style={{marginBottom: '1.5rem', borderRadius: '12px'}}>
                <button className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.75rem'}} onClick={() => {
                  const readyIds = orders.filter(o => o.order_status === 'Ready for Delivery').map(o => o.id);
                  setSelectedDeliveryOrders(readyIds);
                }}>Select All Orders</button>
                <button className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.75rem'}} onClick={() => setSelectedDeliveryOrders([])}>Deselect All</button>
                {selectedDeliveryOrders.length > 0 && <span style={{fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)'}}>{selectedDeliveryOrders.length} orders selected</span>}
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
{orders.filter(o => o.order_status === 'Ready for Delivery').map(o => (<div key={o.id} className="collection-item" style={{background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', display: 'flex', gap: '1.5rem', alignItems: 'center', cursor: 'pointer'}} onClick={() => { if (selectedDeliveryOrders.includes(o.id)) setSelectedDeliveryOrders(p => p.filter(id => id !== o.id)); else setSelectedDeliveryOrders(p => [...p, o.id]); }}><input type="checkbox" style={{width: '20px', height: '20px', cursor: 'pointer'}} checked={selectedDeliveryOrders.includes(o.id)} onChange={() => {}} /><div style={{flex: 1}}><div style={{fontWeight: 800}}>{(o.summary_text || '').split(' ->>')[0]} {o.logs.some(l => l.description?.includes('Delivery Failed')) && (<span className="badge" style={{background: 'var(--danger)', color: 'white', marginLeft: '1rem', fontSize: '0.6rem'}}><Icons.Alert style={{width: 10, height: 10}} /> PREVIOUS ORDER DUE</span>)}</div><div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>ID: #{o.id} • {(o.summary_text || '').split('->>')[1] || ''}</div></div><button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); undoStatus(o); }}>UNDO</button></div>))}{orders.filter(o => o.order_status === 'Ready for Delivery').length === 0 && (<div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>No orders waiting for dispatch.</div>)}</div></div>
            <div className="card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                <h3 style={{margin: 0}}><Icons.Delivery style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}} /> Out for Delivery</h3>
                <button className="btn btn-secondary" style={{background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d'}} onClick={shareToKeep}>
                  <Icons.Export style={{width: 18, height: 18}} /> SHARE TO GOOGLE KEEP
                </button>
              </div>
              <div style={{marginBottom: '2rem'}}>
                <ManufacturingPacking 
                  orders={orders.filter(o => o.order_status === 'Out for Delivery')} 
                  customers={customers} 
                  products={products} 
                />
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {orders.filter(o => o.order_status === 'Out for Delivery').map(o => (
                  <div key={o.id} className="collection-item" style={{background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <div style={{fontWeight: 800}}>{(o.summary_text || '').split(' ->>')[0]} <span className="live-indicator">LIVE</span></div>
                      <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{(o.summary_text || '').split('->>')[1] || ''}</div>
                    </div>
                    <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                      <button className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.7rem', color: 'var(--danger)', border: '1px solid var(--danger)', opacity: 0.8}} onClick={() => updateStatus(o.id, 'Ready for Delivery', 'Delivery Failed - Returned to Dispatch')}>
                        RETURN
                      </button>
                      <button className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.7rem', opacity: 0.6}} onClick={() => cancelOrder(o.id)}>
                        CANCEL
                      </button>
                      <button className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.7rem'}} onClick={() => undoStatus(o)}>UNDO</button>
                      <button className="btn btn-primary" style={{padding: '0.6rem 1.2rem', fontSize: '0.8rem', background: 'var(--success)'}} onClick={() => updateStatus(o.id, 'Delivered', 'Order delivered successfully')}>MARK DELIVERED ✓</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'exp_1' && (
          <div className="express-delivery-page" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            <div className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
                <div style={{width: 60, height: 60}}><AnimatedDelivery /></div>
                <div>
                  <h3 style={{margin: 0}}>Express Driver Dashboard</h3>
                  <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Mobile-optimized view for smooth deliveries.</p>
                </div>
              </div>
              <div style={{display: 'flex', gap: '2rem', alignItems: 'center'}}>
                <button className="btn btn-secondary" style={{background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', height: '48px'}} onClick={shareToKeep}>
                  <Icons.Export style={{width: 18, height: 18}} /> SHARE TO KEEP
                </button>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Active Deliveries</div>
                  <div style={{fontSize: '1.5rem', fontWeight: 900}}>{orders.filter(o => o.order_status === 'Out for Delivery').length}</div>
                </div>
              </div>
            </div>

            <div style={{marginBottom: '1rem'}}>
              <ManufacturingPacking 
                orders={orders.filter(o => o.order_status === 'Out for Delivery')} 
                customers={customers} 
                products={products} 
              />
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem'}}>
              {orders.filter(o => o.order_status === 'Out for Delivery').map(o => {
                const cust = customers.find(c => c.id === o.customer_id);
                const phone = cust?.phone || "";
                const address = cust?.address || "No address provided";
                const cleanPhone = phone.replace(/\D/g, '');

                return (
                  <div key={o.id} className="driver-card">
                    <div className="driver-info-header">
                      <div>
                        <h4 className="driver-customer-name">{cust?.name}</h4>
                        <div className="driver-order-summary">#{o.id} • {(o.summary_text || '').split('->>')[1] || ''}</div>
                      </div>
                      <div className="driver-amount-tag">₹{o.total_amount}</div>
                    </div>

                      <div className="driver-location-box">
                      <div className="driver-address"><Icons.MapPin style={{width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}} /> {address}</div>
                      <div className="driver-contact-row">
                        <a href={`tel:${phone}`} className="driver-quick-link"><Icons.Phone style={{width: 14, height: 14}} /> Call</a>
                        <a href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`}`} target="_blank" rel="noreferrer" className="driver-quick-link"><Icons.WhatsApp style={{width: 14, height: 14}} /> WA</a>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="driver-quick-link"><Icons.MapPin style={{width: 14, height: 14}} /> Map</a>
                      </div>
                    </div>

                    <div className="driver-main-actions">
                      <button className="btn btn-driver-delivered" onClick={() => updateStatus(o.id, 'Delivered', 'Marked Delivered via Express')}>
                        <Icons.CheckCircle /> TAP TO MARK DELIVERED
                      </button>
                      {o.payment_status === 'Pending' && (
                        <button className="btn btn-driver-cash" onClick={() => deliveredAndCash(o.id)}>
                          <Icons.Money /> DELIVERED & CASH COLLECTED
                        </button>
                      )}
                    </div>
                    
                    <div style={{display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem'}}>
                      <button style={{background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem'}} onClick={() => undoStatus(o)}>
                        <Icons.Undo style={{width: 12, height: 12}} /> Undo Dispatch
                      </button>
                      <button style={{background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.4rem'}} onClick={() => updateStatus(o.id, 'Ready for Delivery', 'Delivery Failed - Returned to Dispatch')}>
                        <Icons.Cancel style={{width: 12, height: 12}} /> Return to Ready
                      </button>
                      <button style={{background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.4rem'}} onClick={() => cancelOrder(o.id)}>
                        <Icons.Delete style={{width: 12, height: 12}} /> Cancel Order
                      </button>
                    </div>
                  </div>
                );
              })}
              {orders.filter(o => o.order_status === 'Out for Delivery').length === 0 && (
                <div className="card" style={{gridColumn: '1 / -1', textAlign: 'center', padding: '5rem'}}>
                  <div style={{marginBottom: '1rem'}}><Icons.Delivery style={{width: 48, height: 48, color: 'var(--text-muted)'}} /></div>
                  <h3 style={{margin: 0}}>No active deliveries on the truck.</h3>
                  <p style={{color: 'var(--text-muted)'}}>Dispatch some orders from the Delivery tab to see them here.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'money' && (
          <div className="money-page" style={{display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
              <div className="card" style={{padding: '1.25rem', borderLeft: '6px solid var(--accent)'}}>
                <h3 style={{marginTop: 0, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', justifyContent: 'space-between'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}><Icons.Money className="anim-pulse" style={{color: 'var(--accent)'}} /> Deliveries Pending Payment</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    {(() => {
                      const pending = orders.filter(o => (o.order_status === 'Delivered' || o.order_status === 'Out for Delivery') && o.payment_status === 'Pending');
                      const total = pending.reduce((sum, o) => sum + o.total_amount, 0);
                      return (
                        <span style={{fontSize: '0.85rem', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '0.2rem 0.6rem', borderRadius: '8px', fontWeight: 800}}>
                          {pending.length} Orders • ₹{total.toLocaleString()}
                        </span>
                      );
                    })()}
                    <button className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.7rem'}} onClick={() => setShowPendingPayments(!showPendingPayments)}>
                      {showPendingPayments ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </h3>
                {showPendingPayments && (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                    {orders.filter(o => (o.order_status === 'Delivered' || o.order_status === 'Out for Delivery') && o.payment_status === 'Pending').map(o => (
                      <div key={o.id} className="collection-item" style={{background: 'var(--bg-main)', padding: '0.85rem 1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)'}}>
                        <div><div style={{fontWeight: 800, fontSize: '0.95rem'}}>{(o.summary_text || '').split(' ->>')[0]}</div><div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem'}}><span className="badge" style={{padding: '0.1rem 0.4rem', fontSize: '0.65rem', marginRight: '0.5rem'}}>{o.order_status === 'Out for Delivery' ? <><Icons.Delivery style={{width: 10, height: 10}} /> ON TRUCK</> : <><Icons.Bag style={{width: 10, height: 10}} /> DELIVERED</>}</span>₹{o.total_amount} • ID: #{o.id}</div></div>
                        <div style={{display: 'flex', gap: '0.4rem'}}><button className="btn btn-secondary" style={{padding: '0.35rem 0.65rem', fontSize: '0.7rem'}} onClick={() => undoStatus(o)}>UNDO</button><button className="btn btn-success-outline" style={{padding: '0.35rem 0.65rem', fontSize: '0.7rem', fontWeight: 800}} onClick={() => updatePaymentStatus(o.id, 'Cash')}><Icons.Check style={{width: 12, height: 12}} /> CASH</button><button className="btn btn-accent-outline" style={{padding: '0.35rem 0.65rem', fontSize: '0.7rem', fontWeight: 800}} onClick={() => updatePaymentStatus(o.id, 'UPI')}><Icons.Zap style={{width: 12, height: 12}} /> UPI</button><button className="btn btn-danger-outline" style={{padding: '0.35rem 0.65rem', fontSize: '0.7rem', fontWeight: 800}} onClick={() => updatePaymentStatus(o.id, 'Debt')}><Icons.Alert style={{width: 12, height: 12}} /> DEBT</button></div>
                      </div>
                    ))}
                    {orders.filter(o => (o.order_status === 'Delivered' || o.order_status === 'Out for Delivery') && o.payment_status === 'Pending').length === 0 && (<div style={{textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem'}}>No new deliveries waiting for payment assignment.</div>)}
                  </div>
                )}
              </div>

              <div className="card" style={{padding: '1.25rem', borderLeft: '6px solid var(--danger)'}}>
                <h3 style={{marginTop: 0, marginBottom: '1.25rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', justifyContent: 'space-between'}}><div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}><Icons.Alert style={{width: 24, height: 24}} /> Outstanding Debt List</div><span style={{fontSize: '0.9rem', background: 'var(--danger)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '8px'}}>Total: ₹{orders.filter(o => o.payment_status === 'Debt' && o.order_status !== 'Cancelled').reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}</span></h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                  {orders.filter(o => o.payment_status === 'Debt' && o.order_status !== 'Cancelled').map(o => (
                    <div key={o.id} className="collection-item" style={{background: 'rgba(239, 68, 68, 0.02)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div><div style={{fontWeight: 800, fontSize: '0.95rem'}}>{(o.summary_text || '').split(' ->>')[0]}</div><div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem'}}>Outstanding: <span style={{color: 'var(--danger)', fontWeight: 800}}>₹{o.total_amount}</span> • {formatDisplayDate(o.date)}</div></div><div style={{display: 'flex', gap: '0.4rem'}}><button className="btn btn-success-outline" style={{padding: '0.35rem 0.65rem', fontSize: '0.7rem', fontWeight: 800}} onClick={() => updatePaymentStatus(o.id, 'Cash')}>CASH</button><button className="btn btn-accent-outline" style={{padding: '0.35rem 0.65rem', fontSize: '0.7rem', fontWeight: 800}} onClick={() => updatePaymentStatus(o.id, 'UPI')}>UPI</button></div></div>
                  ))}
                  {orders.filter(o => o.payment_status === 'Debt' && o.order_status !== 'Cancelled').length === 0 && (<div style={{textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem'}}>No outstanding debts.</div>)}
                </div>
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
              {/* Cash Section */}
              <div className="card" style={{padding: '1.5rem', borderTop: '6px solid var(--success)'}}>
                <h3 style={{marginTop: 0, marginBottom: '1.5rem', color: 'var(--success)', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between'}}>
                  Cash Collections Today
                  <span style={{color: 'var(--text-main)'}}>₹{cashToday.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}</span>
                </h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                  {cashToday.map(o => (
                    <div key={o.id} style={{fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)'}}>
                      <div>
                        <div style={{fontWeight: 700}}>{(o.summary_text || '').split(' ->>')[0]}</div>
                        <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                          {o.payment_date ? new Date(o.payment_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date(o.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No Time'} • #{o.id}
                        </div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <div style={{fontWeight: 800}}>₹{o.total_amount}</div>
                        <div style={{display: 'flex', gap: '0.3rem', justifyContent: 'flex-end', marginTop: '0.25rem'}}>
                          {!o.is_payment_approved ? (
                            <button className="btn btn-primary" style={{padding: '0.2rem 0.5rem', fontSize: '0.65rem'}} onClick={() => approvePayment(o.id)}>APPROVE</button>
                          ) : (
                            <span style={{fontSize: '0.65rem', color: 'var(--success)', fontWeight: 800, alignSelf: 'center'}}>✅ APPROVED</span>
                          )}
                          <button className="btn btn-danger-outline" style={{padding: '0.2rem 0.5rem', fontSize: '0.65rem'}} onClick={() => updatePaymentStatus(o.id, 'Pending')}>UNDO</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {cashToday.length === 0 && <div style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem'}}>No cash payments today.</div>}
                </div>
              </div>

              {/* UPI Section */}
              <div className="card" style={{padding: '1.5rem', borderTop: '6px solid var(--accent)'}}>
                <h3 style={{marginTop: 0, marginBottom: '1.5rem', color: 'var(--accent)', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between'}}>
                  UPI Collections Today
                  <span style={{color: 'var(--text-main)'}}>₹{upiToday.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}</span>
                </h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                  {upiToday.map(o => (
                    <div key={o.id} style={{fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)'}}>
                      <div>
                        <div style={{fontWeight: 700}}>{(o.summary_text || '').split(' ->>')[0]}</div>
                        <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                          {o.payment_date ? new Date(o.payment_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date(o.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No Time'} • #{o.id}
                        </div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <div style={{fontWeight: 800}}>₹{o.total_amount}</div>
                        <div style={{display: 'flex', gap: '0.3rem', justifyContent: 'flex-end', marginTop: '0.25rem'}}>
                          {!o.is_payment_approved ? (
                            <button className="btn btn-primary" style={{padding: '0.2rem 0.5rem', fontSize: '0.65rem'}} onClick={() => approvePayment(o.id)}>APPROVE</button>
                          ) : (
                            <span style={{fontSize: '0.65rem', color: 'var(--success)', fontWeight: 800, alignSelf: 'center'}}>✅ APPROVED</span>
                          )}
                          <button className="btn btn-danger-outline" style={{padding: '0.2rem 0.5rem', fontSize: '0.65rem'}} onClick={() => updatePaymentStatus(o.id, 'Pending')}>UNDO</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {upiToday.length === 0 && <div style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem'}}>No UPI payments today.</div>}
                </div>
              </div>

              <div className="card" style={{padding: '1.5rem'}}><h3 style={{marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem'}}>Historical Logs</h3><div style={{display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem'}}>{paymentHistory.slice(0, 10).map(([date, data]) => { const groupTotal = data.orders.reduce((sum, o) => sum + o.total_amount, 0); const allApproved = data.orders.every(o => o.is_payment_approved); return (<div key={date} style={{padding: '0.75rem', background: 'var(--bg-main)', borderRadius: '10px', fontSize: '0.85rem', border: allApproved ? '1px solid var(--success-soft)' : '1px solid var(--border)'}}><div style={{fontWeight: 800, display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem'}}><span>{date}</span><span style={{color: allApproved ? 'var(--success)' : 'var(--accent)'}}>₹{groupTotal.toLocaleString()}</span></div><div style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between'}}><span>{data.orders.length} Orders</span>{!allApproved && <span style={{color: 'var(--accent)', fontWeight: 800}}>⚠️ NEEDS APPROVAL</span>}</div></div>); })}{paymentHistory.length === 0 && (<div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem'}}>No historical payments found.</div>)}</div></div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="products-page">
            <div className="card" style={{marginBottom: '2.5rem'}}><h3 style={{marginTop: 0, marginBottom: '2rem'}}>Manage Price List <Icons.Money style={{display: 'inline-block', verticalAlign: 'middle'}} /></h3><div style={{display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: '1.5rem', alignItems: 'flex-end', marginBottom: '1.5rem'}}><div className="input-group"><label>Product Name</label><input className="styled-input" placeholder="e.g. Masala Khakhra" value={newPName} onChange={e => setNewPName(e.target.value)} /></div><div className="input-group"><label>Wholesale Price (₹)</label><input type="number" className="styled-input" placeholder="0.00" value={newPWPrice} onChange={e => setNewPWPrice(e.target.value)} /></div><div className="input-group"><label>Retail Price (₹)</label><input type="number" className="styled-input" placeholder="0.00" value={newPRPrice} onChange={e => setNewPRPrice(e.target.value)} /></div><button className="btn btn-primary" style={{height: '48px', padding: '0 2rem'}} onClick={addProduct}>ADD PRODUCT</button></div></div>
            <div className="card" style={{padding: 0, overflow: 'hidden'}}><table className="modern-table"><thead><tr><th className="sortable-header" onClick={() => setProductSort({key: 'name', dir: productSort.key === 'name' && productSort.dir === 'asc' ? 'desc' : 'asc'})}>Product <SortIcon active={productSort.key === 'name'} direction={productSort.dir} /></th><th className="sortable-header" onClick={() => setProductSort({key: 'wholesale_price', dir: productSort.key === 'wholesale_price' && productSort.dir === 'asc' ? 'desc' : 'asc'})}>Wholesale <SortIcon active={productSort.key === 'wholesale_price'} direction={productSort.dir} /></th><th className="sortable-header" onClick={() => setProductSort({key: 'retail_price', dir: productSort.key === 'retail_price' && productSort.dir === 'asc' ? 'desc' : 'asc'})}>Retail <SortIcon active={productSort.key === 'retail_price'} direction={productSort.dir} /></th><th>Status</th><th>Actions</th></tr></thead>                    <tbody>{products.map(p => (
                      <tr key={p.id} className={!p.is_active ? 'dimmed' : ''}>
                        <td>
                          {editingProdId === p.id ? (
                            <input className="styled-input" value={tempProduct?.name || ''} onChange={e => setTempProduct(prev => prev ? {...prev, name: e.target.value} : null)} />
                          ) : (
                            <div style={{fontWeight: 700}}>{p.name}</div>
                          )}
                        </td>
                        <td>
                          {editingProdId === p.id ? (
                            <input type="number" className="styled-input" value={tempProduct?.wholesale_price || 0} onChange={e => setTempProduct(prev => prev ? {...prev, wholesale_price: parseFloat(e.target.value)} : null)} />
                          ) : (
                            <span>₹{p.wholesale_price}</span>
                          )}
                        </td>
                        <td>
                          {editingProdId === p.id ? (
                            <input type="number" className="styled-input" value={tempProduct?.retail_price || 0} onChange={e => setTempProduct(prev => prev ? {...prev, retail_price: parseFloat(e.target.value)} : null)} />
                          ) : (
                            <span>₹{p.retail_price}</span>
                          )}
                        </td>
                        <td>
                          <span 
                            className={`badge ${p.is_active ? 'active' : 'inactive'}`} 
                            onClick={() => updateProduct(p, { is_active: p.is_active ? 0 : 1 })} 
                            style={{cursor: 'pointer'}}
                          >
                            {p.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td>
                          <div style={{display: 'flex', gap: '0.5rem'}}>
                            {editingProdId === p.id ? (
                              <>
                                <button className="btn btn-primary" style={{padding: '0.4rem 0.8rem', fontSize: '0.7rem'}} onClick={() => { if (tempProduct) updateProduct(p, tempProduct); setEditingProdId(null); }}>SAVE</button>
                                <button className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.7rem'}} onClick={() => setEditingProdId(null)}>CANCEL</button>
                              </>
                            ) : (
                              <button className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.7rem'}} onClick={() => { setEditingProdId(p.id); setTempProduct(p); }}>EDIT</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}</tbody></table></div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            <div className="card"><div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}><h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem'}}><span style={{width: '24px', height: '24px', display: 'flex'}}><Icons.Analytics /></span> Revenue Trends</h3><div className="toggle-group" style={{width: '400px'}}><button className={analyticsRange === 'day' ? 'active' : ''} onClick={() => setAnalyticsRange('day')}>Day</button><button className={analyticsRange === 'week' ? 'active' : ''} onClick={() => setAnalyticsRange('week')}>Week</button><button className={analyticsRange === 'month' ? 'active' : ''} onClick={() => setAnalyticsRange('month')}>Month</button><button className={analyticsRange === 'custom' ? 'active' : ''} onClick={() => setAnalyticsRange('custom')}>Custom</button></div></div>{analyticsRange === 'custom' && (<div style={{display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: '12px'}}><div className="input-group"><label>Start Date</label><input type="date" className="styled-input" value={customRange.start} onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))} style={{height: '40px'}} /></div><div className="input-group"><label>End Date</label><input type="date" className="styled-input" value={customRange.end} onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))} style={{height: '40px'}} /></div></div>)}<div className="chart-container">{chartData.map(day => (<div key={day.date} className="chart-bar" style={{height: `${(day.total / maxDaily) * 100}%`}} data-label={day.label} data-value={`₹${day.total.toLocaleString()}`}></div>))}</div></div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}><div className="card"><h3 style={{marginTop: 0, marginBottom: '1.5rem'}}>Top 5 Products (by Weight)</h3><div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>{analytics.topProducts.map(([name, weight]) => (<div key={name}><div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 700}}><span>{name}</span><span>{formatWeight(weight)} kg</span></div><div style={{height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden'}}><div style={{height: '100%', background: 'var(--accent-gradient)', width: `${(weight / maxProductWeight) * 100}%`}}></div></div></div>))}</div></div><div className="card"><h3 style={{marginTop: 0, marginBottom: '1.5rem'}}>Top 5 Loyal Customers</h3><div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>{analytics.topCustomers.map(([name, count]) => (<div key={name} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-main)', borderRadius: '12px'}}><span style={{fontWeight: 700}}>{name}</span><span className="badge" style={{background: 'var(--accent-soft)', color: 'var(--accent)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800}}>{count} Orders</span></div>))}</div></div></div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="customers-page" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div className="search-header" style={{width: '400px', margin: 0}}>
                <Icons.Search />
                <input
                  type="text"
                  className="header-search-input"
                  placeholder="Search Customers by Name or Phone..."
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                />
              </div>
              <button className="btn btn-secondary" onClick={deduplicateCustomers} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Icons.Search /> Deduplicate Customers</button>
            </div>
            {/* NEW CUSTOMER PROFILE START */}
            {selectedCustomerId ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <button className="btn btn-secondary" onClick={() => setSelectedCustomerId(null)} style={{width: 'fit-content', borderRadius: '100px'}}>← Back to Customers</button>
                  <button className="btn btn-primary" style={{borderRadius: '100px', background: 'var(--accent-gradient)', border: 'none'}} onClick={() => {
                    const c = customers.find(x => x.id === selectedCustomerId);
                    if (c) {
                      setOrderFilter(c.name);
                      setActiveTab('dashboard');
                    }
                  }}>⚡ NEW ORDER FOR THIS CUSTOMER</button>
                </div>

                {(() => {
                  const rawCust = customers.find(x => x.id === selectedCustomerId);
                  if (!rawCust) return <div className="card">Customer not found.</div>;
                  
                  // Calculate stats specifically for this customer
                  const cOrders = orders.filter(o => o.customer_id === selectedCustomerId).reverse();
                  const totalSpent = cOrders.reduce((s, o) => s + o.total_amount, 0);
                  const lastOrder = cOrders[0];
                  const daysSinceLast = lastOrder ? Math.floor((new Date().getTime() - new Date(lastOrder.date).getTime()) / (1000 * 3600 * 24)) : null;
                  
                  const paidOrders = cOrders.filter(o => (o.payment_status === 'Cash' || o.payment_status === 'UPI') && o.payment_date);
                  const avgDelay = paidOrders.length > 0 ? paidOrders.reduce((acc, o) => {
                    const delay = (new Date(o.payment_date!).getTime() - new Date(o.date).getTime()) / (1000 * 3600 * 24);
                    return acc + delay;
                  }, 0) / paidOrders.length : 0;

                  const debtOrders = cOrders.filter(o => o.payment_status === 'Pending' || o.payment_status === 'Debt');
                  const currentDebt = debtOrders.reduce((sum, o) => sum + o.total_amount, 0);

                  const flavorMap: Record<string, number> = {};
                  cOrders.forEach(o => {
                    if (o.order_status === 'Cancelled') return;
                    o.items.forEach(i => {
                      const name = i.name || products.find(p => p.id === i.product_id)?.name || 'Unknown';
                      flavorMap[name] = (flavorMap[name] || 0) + i.weight;
                    });
                  });
                  const favorites = Object.entries(flavorMap).sort((a,b) => b[1] - a[1]).slice(0, 3);

                  const tier = totalSpent > 50000 ? { label: 'DIAMOND VIP', icon: <Icons.Gem style={{width: 14, height: 14}} />, color: '#0ea5e9' } : 
                               totalSpent > 10000 ? { label: 'GOLD MEMBER', icon: <Icons.Award style={{width: 14, height: 14}} />, color: '#eab308' } : 
                               { label: 'SILVER CLIENT', icon: <Icons.Medal style={{width: 14, height: 14}} />, color: '#94a3b8' };


                  const trust = avgDelay < 2 ? { label: 'Excellent Trust', color: 'var(--success)' } :
                                avgDelay < 5 ? { label: 'Good Standing', color: 'var(--accent)' } :
                                { label: 'Needs Attention', color: 'var(--danger)' };

                  return (
                    <>
                      <div className="card" style={{display: 'grid', gridTemplateColumns: '1fr 400px', gap: '3rem', position: 'relative'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '2.5rem'}}>
                          <div style={{width: 100, height: 100, background: 'var(--accent-soft)', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem'}}>
                            {rawCust.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem'}}>
                              <h2 style={{margin: 0, fontSize: '2.5rem', fontWeight: 900}}>{rawCust.name}</h2>
                              <span className="badge" style={{background: tier.color, color: 'white', fontSize: '0.75rem', padding: '0.4rem 0.8rem'}}>{tier.icon} {tier.label}</span>
                            </div>
                            <p style={{color: 'var(--text-muted)', fontSize: '1.1rem', margin: '0 0 1.5rem 0'}}><Icons.MapPin style={{width: 18, height: 18, verticalAlign: 'middle', marginRight: '5px'}} /> {rawCust.address || 'No address'} | <Icons.Phone style={{width: 18, height: 18, verticalAlign: 'middle', marginRight: '5px'}} /> {rawCust.phone || 'No phone'}</p>
                            <div className="driver-contact-row" style={{width: '350px'}}>
                              <a href={`tel:${rawCust.phone}`} className="driver-quick-link"><Icons.Phone style={{width: 14, height: 14}} /> Call</a>
                              <a href={`https://wa.me/91${rawCust.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="driver-quick-link"><Icons.WhatsApp style={{width: 14, height: 14}} /> WA</a>
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawCust.address || '')}`} target="_blank" rel="noreferrer" className="driver-quick-link"><Icons.MapPin style={{width: 14, height: 14}} /> Map</a>
                            </div>
                          </div>
                        </div>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                          <div className="stat-card" style={{borderTop: '4px solid var(--accent)'}}>
                            <div className="stat-header">TOTAL SPENT</div>
                            <div className="stat-value" style={{fontSize: '1.5rem'}}>₹{totalSpent.toLocaleString()}</div>
                          </div>
                          <div className="stat-card" style={{borderTop: `4px solid ${currentDebt > 0 ? 'var(--danger)' : 'var(--success)'}`}}>
                            <div className="stat-header">BALANCE DUE</div>
                            <div className="stat-value" style={{fontSize: '1.5rem', color: currentDebt > 0 ? 'var(--danger)' : 'var(--success)'}}>₹{currentDebt.toLocaleString()}</div>
                          </div>
                          <div className="stat-card" style={{gridColumn: 'span 2', background: 'var(--bg-main)', border: '1px dashed var(--border)'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                              <div>
                                <div className="stat-header">PAYMENT RELIABILITY</div>
                                <div style={{fontWeight: 800, color: trust.color}}>{trust.label}</div>
                              </div>
                              <div style={{textAlign: 'right'}}>
                                <div className="stat-header">AVG DELAY</div>
                                <div style={{fontWeight: 800}}>{avgDelay.toFixed(1)} Days</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem'}}>
                        <div className="card" style={{padding: 0, overflow: 'hidden'}}>
                          <div style={{padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <h3 style={{margin: 0}}>Order Chronicle</h3>
                            <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                              {daysSinceLast !== null && (
                                <span className={`badge ${daysSinceLast > 15 ? 'active' : ''}`} style={{background: daysSinceLast > 15 ? 'rgba(239, 68, 68, 0.1)' : 'var(--accent-soft)', color: daysSinceLast > 15 ? 'var(--danger)' : 'var(--accent)'}}>
                                  {daysSinceLast === 0 ? 'Ordered Today' : `Last ordered ${daysSinceLast}d ago`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="table-responsive" style={{maxHeight: '500px', overflowY: 'auto'}}>
                            <table className="modern-table">
                              <thead><tr><th>Date</th><th>Summary</th><th>Amount</th><th>Status</th></tr></thead>
                              <tbody>
                                {cOrders.map(o => (
                                  <tr key={o.id}>
                                    <td>{formatDisplayDate(o.date)}</td>
                                    <td style={{fontSize: '0.85rem'}}>{(o.summary_text || '').split('->>')[1] || ''}</td>
                                    <td style={{fontWeight: 800}}>₹{o.total_amount}</td>
                                    <td><span className={`badge ${o.payment_status === 'Debt' ? 'danger' : ''}`}>{o.payment_status}</span></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                          <div className="card" style={{padding: '1.5rem', background: 'var(--accent-gradient)', color: 'white'}}>
                            <h3 style={{marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                              <Icons.Star style={{width: 24, height: 24}} /> Favorite Flavors
                            </h3>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                              {favorites.map(([flavor, weight], idx) => (
                                <div key={idx} style={{background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                  <div style={{fontWeight: 800}}>{flavor}</div>
                                  <div style={{fontSize: '0.9rem', fontWeight: 600}}>{formatWeight(weight as number)} kg</div>
                                </div>
                              ))}
                              {favorites.length === 0 && <div style={{textAlign: 'center', opacity: 0.8}}>No favorites yet.</div>}
                            </div>
                          </div>

                          <div className="card" style={{padding: '1.5rem'}}>
                            <h3 style={{marginTop: 0, marginBottom: '1.5rem'}}>Ordering Habits</h3>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: 'var(--text-muted)'}}>Total Orders</span>
                                <span style={{fontWeight: 800}}>{cOrders.length}</span>
                              </div>
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: 'var(--text-muted)'}}>Avg. Order Value</span>
                                <span style={{fontWeight: 800}}>₹{(totalSpent / (cOrders.length || 1)).toFixed(0)}</span>
                              </div>
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: 'var(--text-muted)'}}>Preferred Price</span>
                                <span style={{fontWeight: 800}}>{rawCust.category}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="card" style={{padding: 0, overflow: 'hidden'}}>
                <table className="modern-table">
                  <thead><tr><th className="sortable-header" onClick={() => setCustomerSort({key: 'name', dir: customerSort.key === 'name' && customerSort.dir === 'asc' ? 'desc' : 'asc'})}>Customer <SortIcon active={customerSort.key === 'name'} direction={customerSort.dir} /></th><th className="sortable-header" onClick={() => setCustomerSort({key: 'orderCount', dir: customerSort.key === 'orderCount' && customerSort.dir === 'asc' ? 'desc' : 'asc'})}>Orders <SortIcon active={customerSort.key === 'orderCount'} direction={customerSort.dir} /></th><th className="sortable-header" onClick={() => setCustomerSort({key: 'totalSpent', dir: customerSort.key === 'totalSpent' && customerSort.dir === 'asc' ? 'desc' : 'asc'})}>Total Spent <SortIcon active={customerSort.key === 'totalSpent'} direction={customerSort.dir} /></th><th>Phone</th><th>Actions</th></tr></thead>
                  <tbody>{customerStats.map(c => (
                    <tr key={c.id} onClick={() => setSelectedCustomerId(c.id)} style={{cursor: 'pointer'}}>
                      <td>
                        <div style={{fontWeight: 700}}>{c.name}</div>
                        <div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>{c.category}</div>
                      </td>
                      <td style={{fontWeight: 800}}>{c.orderCount}</td>
                      <td style={{fontWeight: 800, color: 'var(--accent)'}}>₹{c.totalSpent.toLocaleString()}</td>
                      <td>{c.phone}</td>
                      <td><div style={{display: 'flex', gap: '0.5rem'}}><button className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.75rem'}} onClick={(e) => { e.stopPropagation(); setSelectedCustomerId(c.id); }}>VIEW PROFILE</button><button className="btn btn-secondary" style={{padding: '0.4rem', color: 'var(--text-muted)'}} onClick={(e) => { e.stopPropagation(); deleteCustomer(c.id); }}><Icons.Delete /></button></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'product_analysis' && (
          <div className="product-analysis-page" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            {selectedProductId ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <button className="btn btn-secondary" onClick={() => setSelectedProductId(null)} style={{width: 'fit-content', borderRadius: '100px', padding: '0.6rem 1.25rem'}}>
                    ← Back to Business Overview
                  </button>
                  <div style={{display: 'flex', gap: '1rem'}}>
                    <button className="btn btn-secondary" style={{fontSize: '0.8rem'}} onClick={() => {
                      const p = products.find(x => x.id === selectedProductId);
                      if (p) startEditProduct(p);
                    }}>Edit Pricing</button>
                  </div>
                </div>

                {(() => {
                  const rawProd = products.find(x => x.id === selectedProductId);
                  if (!rawProd) return <div className="card">Product not found.</div>;
                  
                  const history: {orderId: number, date: string, customerId: number, customer: string, weight: number, revenue: number}[] = [];
                  const loyaltyMap: Record<number, {name: string, weight: number, total: number}> = {};
                  let totalWeight = 0;
                  let totalRevenue = 0;

                  orders.forEach(o => {
                    if (o.order_status === 'Cancelled') return;
                    o.items.forEach(item => {
                      if (item.product_id === rawProd.id) {
                        const custName = (o.summary_text || '').split(' ->>')[0];
                        const rev = item.price || item.calculated_price || 0;
                        totalWeight += item.weight;
                        totalRevenue += rev;

                        history.push({
                          orderId: o.id,
                          date: o.date,
                          customerId: o.customer_id,
                          customer: custName,
                          weight: item.weight,
                          revenue: rev
                        });
                        
                        if (!loyaltyMap[o.customer_id]) loyaltyMap[o.customer_id] = { name: custName, weight: 0, total: 0 };
                        loyaltyMap[o.customer_id].weight += item.weight;
                        loyaltyMap[o.customer_id].total += rev;
                      }
                    });
                  });
                  
                  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  const topFans = Object.values(loyaltyMap).sort((a,b) => b.weight - a.weight).slice(0, 5);
                  const isTrending = history.filter(h => {
                    const diff = (new Date().getTime() - new Date(h.date).getTime()) / (1000 * 3600 * 24);
                    return diff <= 7;
                  }).length >= 3;

                  return (
                    <>
                      <div className="card" style={{display: 'grid', gridTemplateColumns: '1fr 350px', gap: '3rem', position: 'relative', overflow: 'hidden'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '2.5rem'}}>
                          <div style={{transform: 'scale(2)', margin: '0 2rem'}}>
                            <ProductAnimation name={rawProd.name} />
                          </div>
                          <div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem'}}>
                              <h2 style={{margin: 0, fontSize: '2.5rem', fontWeight: 900}}>{rawProd.name}</h2>
                              {isTrending && <span className="badge" style={{background: 'var(--accent-gradient)', color: 'white', fontSize: '0.7rem'}}><Icons.Trending style={{width: 14, height: 14}} /> TRENDING</span>}
                            </div>
                            <div style={{display: 'flex', gap: '1rem'}}>
                              <div className="customer-info-card" style={{background: 'var(--bg-main)', border: '1px solid var(--border)'}}>
                                <div className="info-header">WHOLESALE</div>
                                <div className="info-content" style={{fontSize: '1.25rem', color: 'var(--accent)'}}>₹{rawProd.wholesale_price}</div>
                              </div>
                              <div className="customer-info-card" style={{background: 'var(--bg-main)', border: '1px solid var(--border)'}}>
                                <div className="info-header">RETAIL</div>
                                <div className="info-content" style={{fontSize: '1.25rem', color: 'var(--success)'}}>₹{rawProd.retail_price}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1rem'}}>
                          <div className="stat-card" style={{padding: '1.5rem', borderLeft: '4px solid var(--accent)'}}>
                            <div className="stat-header">TOTAL VOLUME</div>
                            <div className="stat-value" style={{fontSize: '1.75rem'}}>{formatWeight(totalWeight)} kg</div>
                          </div>
                          <div className="stat-card" style={{padding: '1.5rem', borderLeft: '4px solid var(--success)'}}>
                            <div className="stat-header">TOTAL REVENUE</div>
                            <div className="stat-value" style={{fontSize: '1.75rem', color: 'var(--success)'}}>₹{totalRevenue.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem'}}>
                        <div className="card" style={{padding: 0, overflow: 'hidden'}}>
                          <div style={{padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <h3 style={{margin: 0}}>Order Chronicle</h3>
                            <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{history.length} Total Orders</div>
                          </div>
                          <div className="table-responsive" style={{maxHeight: '600px', overflowY: 'auto'}}>
                            <table className="modern-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Customer</th>
                                  <th style={{textAlign: 'right'}}>Weight</th>
                                  <th style={{textAlign: 'right'}}>Revenue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {history.map((h, i) => (
                                  <tr key={i} style={{cursor: 'pointer'}} onClick={() => { setSelectedCustomerId(h.customerId); setActiveTab('customers'); }}>
                                    <td>{formatDisplayDate(h.date)}</td>
                                    <td style={{fontWeight: 800}}>{h.customer}</td>
                                    <td style={{textAlign: 'right'}}>{formatWeight(h.weight)} kg</td>
                                    <td style={{textAlign: 'right', color: 'var(--success)'}}>₹{h.revenue.toLocaleString()}</td>
                                  </tr>
                                ))}
                                {history.length === 0 && (
                                  <tr>
                                    <td colSpan={4} style={{textAlign: 'center', padding: '4rem', color: 'var(--text-muted)'}}>
                                      <div style={{marginBottom: '1rem'}}><Icons.Analytics style={{width: 48, height: 48, color: 'var(--text-muted)'}} /></div>
                                      No sales data yet for this product.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="card" style={{padding: '1.5rem'}}>
                          <h3 style={{marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                            <Icons.Star style={{width: 24, height: 24}} /> Customer Loyalty
                          </h3>
                          <p style={{color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem'}}>Top fans who ordered this specific flavor the most.</p>
                          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            {topFans.map((fan, idx) => (
                              <div key={idx} className="collection-item" style={{background: 'var(--bg-main)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                  <div>
                                    <div style={{fontWeight: 800, fontSize: '0.95rem'}}>{fan.name}</div>
                                    <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{formatWeight(fan.weight)} kg total</div>
                                  </div>
                                  <div style={{textAlign: 'right'}}>
                                    <div style={{fontSize: '0.85rem', fontWeight: 900, color: 'var(--accent)'}}>₹{fan.total.toLocaleString()}</div>
                                    <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Revenue</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {topFans.length === 0 && <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '2rem'}}>No loyal fans yet.</div>}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <>
                <div className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
                    <div style={{width: 50, height: 50, background: 'var(--accent-soft)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'}}>
                      <Icons.Analytics />
                    </div>
                    <div>
                      <h3 style={{margin: 0}}>Product Performance Analysis</h3>
                      <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Detailed breakdown of sales volume and revenue by product.</p>
                    </div>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Top Performer</div>
                    <div style={{fontSize: '1.25rem', fontWeight: 900, color: 'var(--success)'}}>
                      {productPerformance.sort((a,b) => b.totalWeight - a.totalWeight)[0]?.name || '---'}
                    </div>
                  </div>
                </div>

                <div className="card" style={{padding: 0, overflow: 'hidden'}}>
                  <table className="modern-table">
                    <thead><tr><th className="sortable-header" onClick={() => setProductSort({key: 'name', dir: productSort.key === 'name' && productSort.dir === 'asc' ? 'desc' : 'asc'})}>Product <SortIcon active={productSort.key === 'name'} direction={productSort.dir} /></th><th className="sortable-header" onClick={() => setProductSort({key: 'totalWeight', dir: productSort.key === 'totalWeight' && productSort.dir === 'asc' ? 'desc' : 'asc'})}>Volume Sold <SortIcon active={productSort.key === 'totalWeight'} direction={productSort.dir} /></th><th className="sortable-header" onClick={() => setProductSort({key: 'totalRevenue', dir: productSort.key === 'totalRevenue' && productSort.dir === 'asc' ? 'desc' : 'asc'})}>Revenue <SortIcon active={productSort.key === 'totalRevenue'} direction={productSort.dir} /></th><th>Key Customer</th><th>Status</th></tr></thead>
                    <tbody>{productPerformance.map(p => (
                      <tr key={p.id} onClick={() => setSelectedProductId(p.id)} style={{cursor: 'pointer'}}>
                        <td><div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}><ProductAnimation name={p.name} /><div style={{fontWeight: 700}}>{p.name}</div></div></td>
                        <td style={{fontWeight: 800}}>{formatWeight(p.totalWeight)} kg</td>
                        <td style={{fontWeight: 800, color: 'var(--success)'}}>₹{p.totalRevenue.toLocaleString()}</td>
                        <td><div style={{fontWeight: 700}}>{p.topCustomerName}</div><div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>{formatWeight(p.topCustomerWeight)} kg total</div></td>
                        <td><span className={`badge ${p.is_active ? 'active' : ''}`} style={{background: p.is_active ? 'var(--accent-soft)' : 'var(--bg-main)', color: p.is_active ? 'var(--accent)' : 'var(--text-muted)'}}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="export-page" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            <div className="card"><div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}><h3 style={{margin: 0}}>Daily Export & Orders Preview</h3><div className="input-group" style={{width: '250px'}}><label>Filter by Date</label><input type="date" className="styled-input" value={exportDate} onChange={e => setExportDate(e.target.value)} /></div></div><div className="table-responsive"><table className="data-table"><thead><tr><th>ID</th><th>Customer</th><th>Summary</th><th>Amount</th><th>Status</th></tr></thead><tbody>{filteredExportOrders.map(o => (<tr key={o.id}><td>#{o.id}</td><td style={{fontWeight: 700}}>{(o.summary_text || '').split(' ->>')[0]}</td><td style={{fontSize: '0.85rem'}}>{(o.summary_text || '').split('->>')[1] || ''}</td><td style={{fontWeight: 800}}>₹{o.total_amount}</td><td><span className="badge" style={{background: o.payment_status === 'Debt' ? '#fff5f5' : 'var(--accent-soft)', color: o.payment_status === 'Debt' ? 'var(--danger)' : 'var(--accent)'}}>{o.payment_status}</span></td></tr>))}{filteredExportOrders.length === 0 && <tr><td colSpan={5} style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>No orders found for this date.</td></tr>}</tbody></table></div><div style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}><button className="btn btn-primary" onClick={() => window.open(api.getExportUrl(exportDate))} disabled={filteredExportOrders.length === 0}>DOWNLOAD EXCEL (.XLSX)</button><button className="btn btn-secondary" onClick={() => window.print()}>PRINT PREVIEW PAGE</button></div></div>
          </div>
        )}

      </main>
      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;
