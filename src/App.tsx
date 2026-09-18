import { useState } from 'react';
import { fetchAvailableOrders, type Order } from './riderPipeline';

export default function App() {
  const [selectedHub, setSelectedHub] = useState<string>('');
  const [stage, setStage] = useState<'hub_select' | 'order_select' | 'allocated'>('hub_select');
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [allocatedOrders, setAllocatedOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [otpErrors, setOtpErrors] = useState<Record<string, string>>({});

  const handleSelectHub = async (hub: string) => {
    setSelectedHub(hub);
    const orders = await fetchAvailableOrders(hub);
    setAvailableOrders(orders);
    setSelectedOrderIds([]);
    setStage('order_select');
  };

  const handleToggleCheckbox = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      if (prev.includes(orderId)) return prev.filter((id) => id !== orderId);
      if (prev.length >= 4) {
        alert('Maximum of 4 orders allowed per batch.');
        return prev;
      }
      return [...prev, orderId];
    });
  };

  const handleConfirmBatch = () => {
    if (selectedOrderIds.length === 0) return;
    const chosen = availableOrders
      .filter((o) => selectedOrderIds.includes(o.id))
      .map((o) => ({ ...o, delivery_status: 'allocated' as const }));

    setAllocatedOrders(chosen);
    setStage('allocated');
  };

  const handleAdvanceStatus = (orderId: string) => {
    setAllocatedOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        let nextStatus: Order['delivery_status'] = order.delivery_status;
        if (order.delivery_status === 'allocated') nextStatus = 'picked_up';
        else if (order.delivery_status === 'picked_up') nextStatus = 'on_the_way';
        else if (order.delivery_status === 'on_the_way') nextStatus = 'reached';

        return { ...order, delivery_status: nextStatus };
      })
    );
  };

  const handleVerifyOtp = (order: Order) => {
    const enteredOtp = otpInputs[order.id] || '';
    if (enteredOtp === order.otp) {
      setAllocatedOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, delivery_status: 'delivered' } : o))
      );
      setOtpErrors((prev) => ({ ...prev, [order.id]: '' }));
    } else {
      setOtpErrors((prev) => ({ ...prev, [order.id]: 'Invalid OTP. Please ask recipient again.' }));
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1>OnMyWay Rider Dashboard</h1>

      {/* HUB SELECTION */}
      {stage === 'hub_select' && (
        <div style={{ border: '1px solid #ccc', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h3>Select Pickup Location</h3>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button onClick={() => handleSelectHub('Main Gate')} style={{ padding: '0.75rem 1.25rem', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}>
              Main Gate
            </button>
            <button onClick={() => handleSelectHub('Amazon Pickup Point')} style={{ padding: '0.75rem 1.25rem', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}>
              Amazon Pickup Point
            </button>
          </div>
        </div>
      )}

      {/* ORDER SELECTION */}
      {stage === 'order_select' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Available Orders at {selectedHub}</h3>
            <button onClick={() => setStage('hub_select')} style={{ padding: '0.3rem 0.6rem', cursor: 'pointer' }}>Change Hub</button>
          </div>

          <p style={{ color: '#555' }}>Select up to 4 orders to allocate to your batch ({selectedOrderIds.length}/4 selected):</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {availableOrders.map((order) => {
              const isChecked = selectedOrderIds.includes(order.id);
              return (
                <label key={order.id} style={{ display: 'flex', alignItems: 'center', padding: '0.8rem 1rem', border: '1px solid #ccc', borderRadius: '6px', backgroundColor: isChecked ? '#e6fffa' : '#fff', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isChecked} onChange={() => handleToggleCheckbox(order.id)} style={{ marginRight: '1rem', transform: 'scale(1.2)' }} />
                  <div>
                    <strong>{order.recipient_name}</strong> — {order.hostel_delivery_block} ({order.order_size})
                  </div>
                </label>
              );
            })}
          </div>

          <button
            onClick={handleConfirmBatch}
            disabled={selectedOrderIds.length === 0}
            style={{ marginTop: '1.5rem', width: '100%', padding: '0.8rem', backgroundColor: selectedOrderIds.length === 0 ? '#cbd5e0' : '#2b6cb0', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: selectedOrderIds.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            Allocate Selected Orders ({selectedOrderIds.length})
          </button>
        </div>
      )}

      {/* ALLOCATED PIPELINE */}
      {stage === 'allocated' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: '#e6fffa', border: '1px solid #319795', borderRadius: '6px' }}>
            <span><strong>Status:</strong> Active Batch ({selectedHub})</span>
            <button onClick={() => setStage('hub_select')} style={{ padding: '0.3rem 0.6rem', cursor: 'pointer' }}>Reset Batch</button>
          </div>

          <h2>Orders Allocated ({allocatedOrders.length})</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {allocatedOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;

              return (
                <div key={order.id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedOrderId((prev) => (prev === order.id ? null : order.id))}
                    style={{ padding: '1rem', background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <strong>{order.recipient_name}</strong> — {order.hostel_delivery_block}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: order.delivery_status === 'delivered' ? '#c6f6d5' : '#feebc8', marginRight: '0.5rem' }}>
                        {order.delivery_status.replace(/_/g, ' ')}
                      </span>
                      {isExpanded ? '▲' : '▼'}
                    </div>
                  </div>

                  {/* Dropdown Content */}
                  {isExpanded && (
                    <div style={{ padding: '1rem', borderTop: '1px solid #eee', background: '#fafafa' }}>
                      <p style={{ margin: '0.25rem 0' }}><strong>OnMyWay Tracking ID:</strong> {order.tracking_id}</p>
                      {order.amazon_tracking_id && (
                        <p style={{ margin: '0.25rem 0', color: '#b7791f' }}><strong>Amazon Tracking ID:</strong> {order.amazon_tracking_id}</p>
                      )}
                      <p style={{ margin: '0.25rem 0' }}><strong>Order Size:</strong> {order.order_size || 'N/A'}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>Recipient Phone:</strong> {order.requester_phone}</p>
                      <p style={{ margin: '0.25rem 0' }}><strong>Delivery Block:</strong> {order.hostel_delivery_block}</p>
                      <p style={{ margin: '0.25rem 0', color: '#4a5568' }}><strong>Special Instructions:</strong> {order.special_instructions || 'None'}</p>

                      {order.delivery_status !== 'reached' && order.delivery_status !== 'delivered' && (
                        <button
                          onClick={() => handleAdvanceStatus(order.id)}
                          style={{ marginTop: '0.75rem', width: '100%', padding: '0.6rem', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          {order.delivery_status === 'allocated' && 'Mark as Picked Up'}
                          {order.delivery_status === 'picked_up' && 'Mark as On The Way'}
                          {order.delivery_status === 'on_the_way' && 'Mark as Reached'}
                        </button>
                      )}

                      {order.delivery_status === 'reached' && (
                        <div style={{ marginTop: '1rem', padding: '0.8rem', background: '#fffaf0', border: '1px solid #fbd38d', borderRadius: '6px' }}>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>Enter 4-digit OTP provided by recipient:</p>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="----"
                              value={otpInputs[order.id] || ''}
                              onChange={(e) => setOtpInputs({ ...otpInputs, [order.id]: e.target.value })}
                              style={{ width: '80px', padding: '0.5rem', fontSize: '1.1rem', textAlign: 'center', letterSpacing: '0.2rem' }}
                            />
                            <button
                              onClick={() => handleVerifyOtp(order)}
                              style={{ padding: '0.5rem 1rem', backgroundColor: '#38a169', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Verify & Complete
                            </button>
                          </div>
                          {otpErrors[order.id] && (
                            <p style={{ color: '#e53e3e', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>{otpErrors[order.id]}</p>
                          )}
                        </div>
                      )}

                      {order.delivery_status === 'delivered' && (
                        <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#c6f6d5', color: '#22543d', borderRadius: '4px', fontWeight: 'bold', textAlign: 'center' }}>
                          ✓ Delivery Completed
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}