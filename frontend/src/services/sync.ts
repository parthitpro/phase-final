import { api } from './api';
import { localDB } from './local-db';

class SyncService {
  private isSyncing = false;

  async fullSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    console.log('Starting Background Sync...');

    try {
      // 1. Pull latest master data (Products & Customers)
      const products = await api.getProducts();
      await localDB.saveProducts(products);
      
      const customers = await api.getCustomers();
      await localDB.saveCustomers(customers);

      // 2. Push unsynced local orders to backend
      const unsynced = await localDB.getUnsyncedOrders();
      for (const order of unsynced) {
        try {
          const res = await api.createOrder(order as any);
          if (res && res.id) {
            await localDB.markSynced(order.id);
          }
        } catch (err) {
          console.error(`Failed to sync order ${order.id}:`, err);
        }
      }

      console.log('Sync Complete ✅');
    } catch (err) {
      console.error('Sync Error:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  startAutoSync(intervalMs = 60000) {
    setInterval(() => this.fullSync(), intervalMs);
    window.addEventListener('online', () => this.fullSync());
  }
}

export const syncService = new SyncService();
