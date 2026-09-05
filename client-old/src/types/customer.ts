import type { Id } from "./common";

/** Customer details captured at delivery-creation time (Create Delivery form). */
export interface Customer {
  id?: Id;
  name: string;
  phone: string;
  address: string;
}
