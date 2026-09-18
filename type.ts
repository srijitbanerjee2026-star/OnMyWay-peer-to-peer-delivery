export interface Order {
  id: string;
  created_at?: string;
  requester_id: string;
  pickup_location: 'AMAZON_KIOSK' | 'MAIN_GATE';
  tracking_id?: string | null;
  pickup_otp: string;
  order_size: 'Regular' | 'Large';
  phone: string;
  full_name: string;
  hostel_block: string;
  delivery_pin: string;
  delivery_fee: number;
  is_prepaid: boolean;
  status: 'PENDING' | 'ALLOCATED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  status_update?: string | null;
}