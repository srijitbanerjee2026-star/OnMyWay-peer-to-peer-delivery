export interface Order {
  id: string;
  tracking_id: string;
  amazon_tracking_id?: string;
  order_size: 'Regular' | 'Large' | '';
  requester_phone: string;
  recipient_name: string;
  hostel_delivery_block: string;
  special_instructions?: string;
  otp: string;
  delivery_status: 'available' | 'allocated' | 'picked_up' | 'on_the_way' | 'reached' | 'delivered';
}

export const MOCK_DATABASE_ORDERS: Record<string, Order[]> = {
  'Main Gate': [
    { id: '1', tracking_id: 'CD-1001', order_size: 'Regular', requester_phone: '+91 9876543210', recipient_name: 'Rahul Sharma', hostel_delivery_block: 'Block A', special_instructions: 'Leave near the security desk if I do not answer.', otp: '1234', delivery_status: 'available' },
    { id: '2', tracking_id: 'CD-1002', order_size: 'Large', requester_phone: '+91 9876543211', recipient_name: 'Priya Patel', hostel_delivery_block: 'Block B', special_instructions: 'Call twice when outside.', otp: '5678', delivery_status: 'available' },
    { id: '3', tracking_id: 'CD-1003', order_size: 'Regular', requester_phone: '+91 9876543212', recipient_name: 'Aman Verma', hostel_delivery_block: 'Block C', special_instructions: 'Fragile items, handle with care.', otp: '9012', delivery_status: 'available' },
    { id: '4', tracking_id: 'CD-1004', order_size: 'Regular', requester_phone: '+91 9876543213', recipient_name: 'Sneh Singh', hostel_delivery_block: 'Block A', special_instructions: '', otp: '3456', delivery_status: 'available' },
    { id: '5', tracking_id: 'CD-1005', order_size: 'Large', requester_phone: '+91 9876543214', recipient_name: 'Kabir Mehta', hostel_delivery_block: 'Block D', special_instructions: 'Deliver to Room 302.', otp: '7890', delivery_status: 'available' },
    { id: '6', tracking_id: 'CD-1006', order_size: 'Regular', requester_phone: '+91 9876543215', recipient_name: 'Neha Gupta', hostel_delivery_block: 'Block B', special_instructions: 'Please knock on the door.', otp: '2345', delivery_status: 'available' },
    { id: '7', tracking_id: 'CD-1007', order_size: 'Large', requester_phone: '+91 9876543216', recipient_name: 'Arjun Reddy', hostel_delivery_block: 'Block C', special_instructions: 'Deliver before 8 PM.', otp: '6789', delivery_status: 'available' },
    { id: '8', tracking_id: 'CD-1008', order_size: 'Regular', requester_phone: '+91 9876543217', recipient_name: 'Riya Sen', hostel_delivery_block: 'Block E', special_instructions: '', otp: '0123', delivery_status: 'available' },
    { id: '9', tracking_id: 'CD-1009', order_size: 'Large', requester_phone: '+91 9876543218', recipient_name: 'Devansh Joshi', hostel_delivery_block: 'Block A', special_instructions: 'Call upon arrival.', otp: '4567', delivery_status: 'available' },
    { id: '10', tracking_id: 'CD-1010', order_size: 'Regular', requester_phone: '+91 9876543219', recipient_name: 'Meera Nair', hostel_delivery_block: 'Block D', special_instructions: 'Leave with roommate if absent.', otp: '8901', delivery_status: 'available' }
  ],
  'Amazon Pickup Point': [
    { id: '11', tracking_id: 'AZ-2001', amazon_tracking_id: 'TBA987654321000', order_size: 'Large', requester_phone: '+91 9123456780', recipient_name: 'Ananya Roy', hostel_delivery_block: 'Block D', special_instructions: 'Ring the doorbell.', otp: '4321', delivery_status: 'available' },
    { id: '12', tracking_id: 'AZ-2002', amazon_tracking_id: 'TBA123456789000', order_size: 'Regular', requester_phone: '+91 9123456781', recipient_name: 'Vikram Das', hostel_delivery_block: 'Block B', special_instructions: 'Please deliver after 5 PM.', otp: '8765', delivery_status: 'available' },
    { id: '13', tracking_id: 'AZ-2003', amazon_tracking_id: 'TBA456789123000', order_size: 'Regular', requester_phone: '+91 9123456782', recipient_name: 'Kavya Nair', hostel_delivery_block: 'Block C', special_instructions: '', otp: '2109', delivery_status: 'available' },
    { id: '14', tracking_id: 'AZ-2004', amazon_tracking_id: 'TBA321654987000', order_size: 'Large', requester_phone: '+91 9123456783', recipient_name: 'Rohan Gupta', hostel_delivery_block: 'Block A', special_instructions: 'Call recipient upon arrival.', otp: '6543', delivery_status: 'available' },
    { id: '15', tracking_id: 'AZ-2005', amazon_tracking_id: 'TBA654987321000', order_size: 'Regular', requester_phone: '+91 9123456784', recipient_name: 'Isha Rao', hostel_delivery_block: 'Block E', special_instructions: 'Hand over directly to me.', otp: '0987', delivery_status: 'available' },
    { id: '16', tracking_id: 'AZ-2006', amazon_tracking_id: 'TBA789123456000', order_size: 'Large', requester_phone: '+91 9123456785', recipient_name: 'Karan Malhotra', hostel_delivery_block: 'Block B', special_instructions: '', otp: '5432', delivery_status: 'available' },
    { id: '17', tracking_id: 'AZ-2007', amazon_tracking_id: 'TBA147258369000', order_size: 'Regular', requester_phone: '+91 9123456786', recipient_name: 'Simran Kaur', hostel_delivery_block: 'Block A', special_instructions: 'Keep in parcel locker.', otp: '9876', delivery_status: 'available' },
    { id: '18', tracking_id: 'AZ-2008', amazon_tracking_id: 'TBA369258147000', order_size: 'Large', requester_phone: '+91 9123456787', recipient_name: 'Aakash Mishra', hostel_delivery_block: 'Block D', special_instructions: 'Heavy parcel.', otp: '3210', delivery_status: 'available' },
    { id: '19', tracking_id: 'AZ-2009', amazon_tracking_id: 'TBA258147369000', order_size: 'Regular', requester_phone: '+91 9123456788', recipient_name: 'Tanvi Shah', hostel_delivery_block: 'Block C', special_instructions: 'Deliver to ground floor.', otp: '7654', delivery_status: 'available' },
    { id: '20', tracking_id: 'AZ-2010', amazon_tracking_id: 'TBA951753852000', order_size: 'Regular', requester_phone: '+91 9123456789', recipient_name: 'Yash Saxena', hostel_delivery_block: 'Block E', special_instructions: 'Call twice.', otp: '1593', delivery_status: 'available' }
  ]
};

export async function fetchAvailableOrders(hub: string): Promise<Order[]> {
  return MOCK_DATABASE_ORDERS[hub] || [];
}