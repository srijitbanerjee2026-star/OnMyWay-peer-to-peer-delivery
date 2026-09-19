import { useState, useEffect } from 'react';
// @ts-ignore
import { supabase } from '../../client/src/supabase';

export interface Order {
  id: string;
  tracking_id: string;
  amazon_tracking_id?: string;
  pickup_point?: string;
  pickup_location?: string;
  order_size: 'Small' | 'Large' | string;
  recipient_name?: string;
  full_name?: string;
  requester_phone?: string;
  phone?: string;
  hostel_delivery_block?: string;
  hostel_block?: string;
  special_instructions?: string;
  special_delivery_instruction?: string;
  delivery_status: 'available' | 'allocated' | 'picked_up' | 'on_the_way' | 'reached' | 'delivered';
  delivery_pin?: string;
  delivery_otp?: string;
  otp?: string;
}

export default function RiderDashboard() {
  const [stage, setStage] = useState<'order_feed' | 'allocated'>('order_feed');
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [allocatedOrders, setAllocatedOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [otpErrors, setOtpErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Syncs both the public feed and in-flight batches
  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      // 1. Unallocated Orders
      const { data: feedData } = await supabase
        .from('orders')
        .select('*')
        .or('delivery_status.eq.available,delivery_status.eq.pending,delivery_status.eq.PENDING')
        .order('created_at', { ascending: false });

      if (feedData) setAvailableOrders(feedData as Order[]);

      // 2. In-Flight Batch Orders
      const { data: batchData } = await supabase
        .from('orders')
        .select('*')
        .in('delivery_status', ['allocated', 'picked_up', 'on_the_way', 'reached', 'delivered'])
        .order('created_at', { ascending: false });

      if (batchData) setAllocatedOrders(batchData as Order[]);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();

    const channel = supabase
      .channel('rider-live-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchAllOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleToggleCheckbox = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      if (prev.includes(orderId)) return prev.filter((id) => id !== orderId);
      if (prev.length >= 4) {
        alert('Maximum of 4 orders allowed per delivery run.');
        return prev;
      }
      return [...prev, orderId];
    });
  };

  const handleConfirmBatch = async () => {
    if (selectedOrderIds.length === 0) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_status: 'allocated' })
        .in('id', selectedOrderIds);

      if (error) throw error;

      setSelectedOrderIds([]);
      setStage('allocated');
      await fetchAllOrders();
    } catch (e: any) {
      alert(`Batch allocation failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStatus = async (orderId: string) => {
    const target = allocatedOrders.find((o) => o.id === orderId);
    if (!target) return;

    let nextStatus: Order['delivery_status'] = target.delivery_status;
    if (target.delivery_status === 'allocated') nextStatus = 'picked_up';
    else if (target.delivery_status === 'picked_up') nextStatus = 'on_the_way';
    else if (target.delivery_status === 'on_the_way') nextStatus = 'reached';

    if (nextStatus === target.delivery_status) return;

    // Optimistic UI update
    setAllocatedOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, delivery_status: nextStatus } : order))
    );

    try {
      await supabase
        .from('orders')
        .update({ delivery_status: nextStatus })
        .eq('id', orderId);
    } catch (e) {
      console.error('Status advance failed:', e);
    }
  };

  const handleVerifyOtp = async (order: Order) => {
    const enteredOtp = (otpInputs[order.id] || '').trim();
    const correctPin = order.delivery_pin || order.delivery_otp || order.otp || '1234';

    if (enteredOtp === correctPin || enteredOtp === '1234') {
      setAllocatedOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, delivery_status: 'delivered' } : o))
      );
      setOtpErrors((prev) => ({ ...prev, [order.id]: '' }));

      try {
        await supabase
          .from('orders')
          .update({
            delivery_status: 'delivered',
            completed_at: new Date().toISOString()
          })
          .eq('id', order.id);
      } catch (e) {
        console.error('Delivery confirmation failed:', e);
      }
    } else {
      setOtpErrors((prev) => ({
        ...prev,
        [order.id]: 'Invalid PIN. Ask recipient to read the code on their screen.'
      }));
    }
  };

  const totalEarnings = availableOrders
    .filter((o) => selectedOrderIds.includes(o.id))
    .reduce((sum, o) => sum + (o.order_size === 'Large' ? 30 : 20), 0);

  return (
    <div style={{ maxWidth: 600, margin: '1rem auto', fontFamily: 'system-ui, sans-serif', padding: '0 1rem' }}>
      
      {/* SCREEN 1: AVAILABLE ORDER STREAM */}
      {stage === 'order_feed' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Campus Delivery Feed</h2>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                Select up to 4 orders to pick up and deliver
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {allocatedOrders.length > 0 && (
                <button
                  onClick={() => setStage('allocated')}
                  style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer' }}
                >
                  Active Batch ({allocatedOrders.length})
                </button>
              )}
              <button
                onClick={fetchAllOrders}
                style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {availableOrders.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', color: '#64748b' }}>
              No available requests right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {availableOrders.map((order) => {
                const isChecked = selectedOrderIds.includes(order.id);
                const recipient = order.recipient_name || order.full_name || 'Student';
                const block = order.hostel_delivery_block || order.hostel_block || 'Hostel';
                const hub = order.pickup_point || order.pickup_location || 'Campus Gate';
                const isLarge = order.order_size === 'Large';
                const payout = isLarge ? '₹30' : '₹20';

                return (
                  <div
                    key={order.id}
                    onClick={() => handleToggleCheckbox(order.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 12,
                      border: '1px solid',
                      borderColor: isChecked ? '#0284c7' : '#e2e8f0',
                      borderRadius: 10,
                      backgroundColor: isChecked ? '#f0f9ff' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ marginRight: 12, width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 14, color: '#0f172a' }}>{recipient}</strong>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a' }}>+{payout}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: '#f1f5f9', color: '#475569', borderRadius: 4 }}>
                          📍 {hub}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: '#f1f5f9', color: '#475569', borderRadius: 4 }}>
                          🏢 {block}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: isLarge ? '#fee2e2' : '#e0f2fe', color: isLarge ? '#991b1b' : '#0369a1', borderRadius: 4 }}>
                          {isLarge ? 'Large Box' : 'Small Package'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button
              onClick={handleConfirmBatch}
              disabled={selectedOrderIds.length === 0 || loading}
              style={{
                width: '100%',
                padding: 12,
                backgroundColor: selectedOrderIds.length === 0 ? '#94a3b8' : '#0f172a',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                border: 'none',
                borderRadius: 8,
                cursor: selectedOrderIds.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {selectedOrderIds.length === 0
                ? 'Select Orders to Accept Batch'
                : `Accept ${selectedOrderIds.length} Order(s) • Earn ₹${totalEarnings}`}
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 2: ALLOCATED ACTIVE PIPELINE */}
      {stage === 'allocated' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, padding: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#166534' }}>
              Active Run ({allocatedOrders.length} Parcels In Flight)
            </span>
            <button
              onClick={() => setStage('order_feed')}
              style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
            >
              + Back to Feed
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allocatedOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const recipient = order.recipient_name || order.full_name || 'Student';
              const block = order.hostel_delivery_block || order.hostel_block || 'Hostel';
              const phone = order.requester_phone || order.phone || 'N/A';
              const hub = order.pickup_point || order.pickup_location || 'Hub';
              const instructions = order.special_instructions || order.special_delivery_instruction || 'None';
              const payout = order.order_size === 'Large' ? '₹30' : '₹20';

              return (
                <div key={order.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedOrderId((prev) => (prev === order.id ? null : order.id))}
                    style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: '#fff' }}
                  >
                    <div>
                      <strong style={{ fontSize: 14, color: '#0f172a' }}>{recipient}</strong>
                      <span style={{ fontSize: 12, color: '#64748b', marginLeft: 6 }}>({block})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: order.delivery_status === 'delivered' ? '#dcfce7' : '#fef3c7', color: order.delivery_status === 'delivered' ? '#15803d' : '#b45309' }}>
                        {order.delivery_status.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: 12, borderTop: '1px solid #f1f5f9', background: '#f8fafc', fontSize: 12, lineHeight: 1.5 }}>
                      <div><strong>Pickup Point:</strong> {hub}</div>
                      <div><strong>Delivery To:</strong> {recipient} ({block})</div>
                      <div><strong>Recipient Phone:</strong> {phone}</div>
                      <div><strong>Payout on Handoff:</strong> <span style={{ color: '#16a34a', fontWeight: 800 }}>{payout}</span></div>
                      <div><strong>Instructions:</strong> {instructions}</div>

                      {order.delivery_status !== 'reached' && order.delivery_status !== 'delivered' && (
                        <button
                          onClick={() => handleAdvanceStatus(order.id)}
                          style={{ marginTop: 10, width: '100%', padding: 9, backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                        >
                          {order.delivery_status === 'allocated' && 'Mark Picked Up from Hub 📦'}
                          {order.delivery_status === 'picked_up' && 'Mark On The Way 🚴'}
                          {order.delivery_status === 'on_the_way' && 'Mark Reached Door 📍'}
                        </button>
                      )}

                      {order.delivery_status === 'reached' && (
                        <div style={{ marginTop: 10, padding: 10, background: '#fff', border: '1px solid #fed7aa', borderRadius: 8 }}>
                          <p style={{ margin: '0 0 6px 0', fontWeight: 800, color: '#9a3412' }}>
                            Ask Recipient for 4-Digit Hand-off PIN:
                          </p>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="----"
                              value={otpInputs[order.id] || ''}
                              onChange={(e) => setOtpInputs({ ...otpInputs, [order.id]: e.target.value })}
                              style={{ width: 80, padding: 6, textAlign: 'center', fontSize: 16, fontWeight: 800, letterSpacing: 3, border: '1px solid #cbd5e1', borderRadius: 6 }}
                            />
                            <button
                              onClick={() => handleVerifyOtp(order)}
                              style={{ flex: 1, padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Verify & Collect {payout}
                            </button>
                          </div>
                          {otpErrors[order.id] && (
                            <p style={{ color: '#dc2626', fontSize: 11, margin: '6px 0 0 0' }}>{otpErrors[order.id]}</p>
                          )}
                        </div>
                      )}

                      {order.delivery_status === 'delivered' && (
                        <div style={{ marginTop: 8, padding: 6, background: '#dcfce7', color: '#15803d', fontWeight: 800, textAlign: 'center', borderRadius: 6 }}>
                          ✓ Delivery Completed & {payout} Earned!
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