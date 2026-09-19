export type OrderStatus = 'PENDING' | 'ALLOCATED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
export type PickupPoint = 'MAIN_GATE' | 'PRP_KIOSK';

export type User = {
  id: string;
  email: string;
  full_name: string;
  reg_number: string;
  phone: string;
  hostel_block: string;
  room_number: string;
  upi_vpa: string | null;
  id_card_url: string | null;
  is_verified: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  requester_id: string;
  rider_id: string | null;
  courier_or_service: string;
  tracking_or_order_id: string;
  recipient_name_on_box: string;
  phone_last4: string;
  pickup_location: PickupPoint;
  target_block: string;
  delivery_fee: number;
  is_prepaid: boolean;
  status: OrderStatus;
  delivery_pin: string;
  allocated_at: string | null;
  lease_expires_at: string | null;
  created_at: string;
  updated_at: string;
};