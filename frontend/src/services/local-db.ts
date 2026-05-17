import type { Product, Customer, Order } from '../schema';

class LocalDBService {
  async init() {
    console.log('Local DB Mock Initialized');
  }

  async getProducts(): Promise<Product[]> { return []; }
  async saveProducts(_products: Product[]) {}
  async getCustomers(): Promise<Customer[]> { return []; }
  async saveCustomers(_customers: Customer[]) {}
  async getOrders(): Promise<Order[]> { return []; }
  async createOrder(_order: any): Promise<number> { return 0; }
  async updateOrderStatus(_orderId: number, _status: string) {}
  async getUnsyncedOrders(): Promise<Order[]> { return []; }
  async markSynced(_orderId: number) {}
}

export const localDB = new LocalDBService();
