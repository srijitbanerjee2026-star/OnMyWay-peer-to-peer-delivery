export type Order = {
  id: string;
  requester_id: string;
  rider_id: string | null;
  courier_or_service: string;
  tracking_or_order_id: string;
  recipient_name_on_box: string;
  phone_last4: string;
  pickup_location: 'MAIN_GATE' | 'PRP_KIOSK';
  target_block: string;
  delivery_fee: number;
  status: 'PENDING' | 'ALLOCATED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  delivery_pin: string;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  hostel_block: string;
  id_card_url: string;
  is_verified: boolean;
  created_at: string;
};