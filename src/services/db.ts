// This file simulates a real backend API and database connection

export interface Delivery {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  itemDescription: string;
  status: 'REQUESTED' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED';
  time: string;
  riderId?: string;
}

// Simulates a slow 3G mobile network connection (800 milliseconds)
const NETWORK_DELAY = 800; 

export const api = {
  // Fetch all deliveries from the database
  getDeliveries: async (): Promise<Delivery[]> => {
    await new Promise(resolve => setTimeout(resolve, NETWORK_DELAY));
    const data = localStorage.getItem('reflex_db');
    return data ? JSON.parse(data) : [];
  },

  // Save a new delivery from the Retailer
  createDelivery: async (deliveryData: Omit<Delivery, 'id' | 'status' | 'time'>) => {
    await new Promise(resolve => setTimeout(resolve, NETWORK_DELAY));
    const current = await api.getDeliveries();
    
    const newDelivery: Delivery = {
      ...deliveryData,
      id: `RX-${Math.floor(Math.random() * 10000)}`,
      status: 'REQUESTED',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    localStorage.setItem('reflex_db', JSON.stringify([newDelivery, ...current]));
    return newDelivery;
  },

  // Update a delivery (when Dispatcher assigns or Rider picks up)
  updateDelivery: async (id: string, updates: Partial<Delivery>) => {
    await new Promise(resolve => setTimeout(resolve, NETWORK_DELAY));
    const current = await api.getDeliveries();
    
    const updated = current.map(dev => {
      if (dev.id === id) {
        // If the dispatcher is assigning a rider, explicitly stamp the riderId
        const riderId = updates.status === 'ASSIGNED' && !updates.riderId ? 'R-01' : updates.riderId;
        return { ...dev, ...updates, ...(riderId ? { riderId } : {}) };
      }
      return dev;
    });
    
    localStorage.setItem('reflex_db', JSON.stringify(updated));
    return true;
  }
};