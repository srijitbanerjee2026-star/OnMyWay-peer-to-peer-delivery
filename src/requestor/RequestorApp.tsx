import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
// @ts-ignore
import { supabase } from '../../client/src/supabase';

type AppStep = 'PICKUP_SELECT' | 'ORDER_FORM' | 'ACTIVE_REQUESTS';
type PickupPoint = 'Amazon Kiosk' | 'Main Gate';
type OrderSize = 'Small' | 'Large';

interface FormState {
  pickup_point: PickupPoint;
  tracking_id: string;
  order_size: OrderSize;
  order_description: string;
  phone: string;
  full_name: string;
  hostel_block: string;
  handling_instructions: string;
  order_instruction: string;
  special_delivery_instruction: string;
}

const initialFormState: FormState = {
  pickup_point: 'Amazon Kiosk',
  tracking_id: '',
  order_size: 'Small',
  order_description: '',
  phone: '',
  full_name: '',
  hostel_block: '',
  handling_instructions: '',
  order_instruction: '',
  special_delivery_instruction: '',
};

export default function RequestorApp() {
  const [step, setStep] = useState<AppStep>('PICKUP_SELECT');
  const [formData, setFormData] = useState<FormState>(() => {
    const savedPhone = localStorage.getItem('omw_user_phone') || '';
    const savedName = localStorage.getItem('omw_user_name') || '';
    return { ...initialFormState, phone: savedPhone, full_name: savedName };
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const deliveryFee = formData.order_size === 'Large' ? 30 : 20;

  const fetchUserOrders = async () => {
    const activePhone = formData.phone || localStorage.getItem('omw_user_phone');
    if (!activePhone) {
      setOrders([]);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('requester_phone', activePhone.trim())
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
  };

  useEffect(() => {
    fetchUserOrders();

    const channel = supabase
      .channel('requestor-isolated-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchUserOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [formData.phone]);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    if (name === 'phone') {
      const cleaned = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: cleaned }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePickupSelection = (point: PickupPoint) => {
    setFormData((prev) => ({ ...prev, pickup_point: point }));
    setErrorMsg(null);
    setStep('ORDER_FORM');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone || !formData.hostel_block) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
    const fallbackTrackingId = formData.tracking_id.trim() || `OMW-${Math.floor(100000 + Math.random() * 900000)}`;

    // Store phone to isolate future fetches to this session
    localStorage.setItem('omw_user_phone', formData.phone.trim());
    localStorage.setItem('omw_user_name', formData.full_name.trim());

    const payload = {
      tracking_id: fallbackTrackingId,
      pickup_point: formData.pickup_point,
      order_size: formData.order_size,
      order_description: formData.order_description.trim(),
      recipient_name: formData.full_name.trim(),
      requester_phone: formData.phone.trim(),
      hostel_delivery_block: formData.hostel_block.trim(),
      handling_instructions: formData.handling_instructions.trim(),
      order_instructions: formData.order_instruction.trim(),
      special_instructions: formData.special_delivery_instruction.trim(),
      delivery_status: 'available',
      delivery_pin: generatedPin
    };

    const { error } = await supabase.from('orders').insert([payload]);

    if (error) {
      setErrorMsg(`Order submission failed: ${error.message}`);
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep('ACTIVE_REQUESTS');
    fetchUserOrders();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return { label: 'Finding Rider ⏳', bg: '#fef3c7', text: '#b45309' };
      case 'allocated':
        return { label: 'Rider Assigned 🛵', bg: '#e0e7ff', text: '#4338ca' };
      case 'picked_up':
        return { label: 'Picked Up 📦', bg: '#e0f2fe', text: '#0369a1' };
      case 'on_the_way':
        return { label: 'On The Way 🚴', bg: '#fef08a', text: '#854d0e' };
      case 'reached':
        return { label: 'Rider At Door 📍', bg: '#fed7aa', text: '#9a3412' };
      case 'delivered':
        return { label: 'Delivered ✓', bg: '#dcfce7', text: '#15803d' };
      default:
        return { label: status, bg: '#f1f5f9', text: '#475569' };
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '1rem auto', fontFamily: 'system-ui, sans-serif', padding: '0 1rem' }}>
      
      {/* SCREEN 1: HUB SELECT */}
      {step === 'PICKUP_SELECT' && (
        <div style={{ background: '#0f172a', color: '#fff', padding: 24, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Request Delivery</h2>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0 0' }}>Select parcel pickup point:</p>
            </div>
            {orders.length > 0 && (
              <button
                onClick={() => setStep('ACTIVE_REQUESTS')}
                style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, background: '#334155', color: '#38bdf8', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                My Orders ({orders.length})
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => handlePickupSelection('Amazon Kiosk')}
              style={{ padding: 14, background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#fff', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>📦 Amazon Kiosk</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Gate / Kiosk pickup point</div>
            </button>

            <button
              onClick={() => handlePickupSelection('Main Gate')}
              style={{ padding: 14, background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#fff', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>🚪 Main Gate</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Main campus entry pickup</div>
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 2: ORDER FORM */}
      {step === 'ORDER_FORM' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 20, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button
              onClick={() => setStep('PICKUP_SELECT')}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}
            >
              ← Back
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Pickup: {formData.pickup_point}</span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Amazon / Tracking ID</label>
              <input
                name="tracking_id"
                value={formData.tracking_id}
                onChange={handleInputChange}
                placeholder="e.g. 403-1234567-8901234"
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Package Size *</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, order_size: 'Small' }))}
                  style={{ flex: 1, padding: 8, fontWeight: 700, borderRadius: 6, border: '1px solid #cbd5e1', background: formData.order_size === 'Small' ? '#2563eb' : '#fff', color: formData.order_size === 'Small' ? '#fff' : '#000', cursor: 'pointer' }}
                >
                  Small (₹20)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, order_size: 'Large' }))}
                  style={{ flex: 1, padding: 8, fontWeight: 700, borderRadius: 6, border: '1px solid #cbd5e1', background: formData.order_size === 'Large' ? '#2563eb' : '#fff', color: formData.order_size === 'Large' ? '#fff' : '#000', cursor: 'pointer' }}
                >
                  Large (₹30)
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Full Name *</label>
              <input
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Recipient name"
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Phone Number *</label>
              <input
                name="phone"
                required
                maxLength={10}
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="10-digit phone"
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Hostel Block & Room *</label>
              <input
                name="hostel_block"
                required
                value={formData.hostel_block}
                onChange={handleInputChange}
                placeholder="e.g. Block Q - Room 412"
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Special Delivery Instruction</label>
              <textarea
                name="special_delivery_instruction"
                rows={2}
                value={formData.special_delivery_instruction}
                onChange={handleInputChange}
                placeholder="e.g. Call before coming to the hostel"
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'none' }}
              />
            </div>

            {errorMsg && <div style={{ color: '#dc2626', fontSize: 12 }}>{errorMsg}</div>}

            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: 8, padding: 12, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
            >
              {loading ? 'Submitting...' : `Confirm Delivery Request • ₹${deliveryFee}`}
            </button>
          </form>
        </div>
      )}

      {/* SCREEN 3: ACTIVE REQUESTS (USER'S PERSONAL REQUESTS ONLY) */}
      {step === 'ACTIVE_REQUESTS' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>My Deliveries</h3>
              <span style={{ fontSize: 11, color: '#64748b' }}>Account: {formData.phone || 'Active Session'}</span>
            </div>
            <button
              onClick={() => setStep('PICKUP_SELECT')}
              style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              + New Request
            </button>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', color: '#64748b', fontSize: 13 }}>
              You have no active orders placed under this phone number.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orders.map((order) => {
                const badge = getStatusBadge(order.delivery_status || 'available');
                const userPin = order.delivery_pin || order.delivery_otp || order.otp || '----';

                return (
                  <div key={order.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: '#0284c7' }}>{order.tracking_id}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4, background: badge.bg, color: badge.text }}>
                        {badge.label}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.4 }}>
                      <div><strong>Drop-off:</strong> {order.recipient_name} ({order.hostel_delivery_block})</div>
                      <div><strong>Hub:</strong> {order.pickup_point}</div>
                      <div><strong>Size:</strong> {order.order_size}</div>
                    </div>

                    {/* Strict Mutual Door Handshake PIN */}
                    {order.delivery_status !== 'delivered' && (
                      <div style={{ marginTop: 10, padding: 10, background: '#0f172a', borderRadius: 8, textAlign: 'center', color: '#fff' }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>
                          🔒 Confidential PIN (Share verbally with rider at door):
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 6, color: '#4ade80' }}>
                          {userPin}
                        </div>
                      </div>
                    )}

                    {order.delivery_status === 'delivered' && (
                      <div style={{ marginTop: 8, padding: 6, background: '#dcfce7', color: '#15803d', fontWeight: 700, textAlign: 'center', borderRadius: 6, fontSize: 11 }}>
                        ✓ Delivery Verified & Completed
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}