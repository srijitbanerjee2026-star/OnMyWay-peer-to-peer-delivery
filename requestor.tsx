// components/OrderManager.tsx
'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import supabase from './supabase';
import { Order } from './type';

interface FormState {
  pickup_point: 'AMAZON_KIOSK' | 'MAIN_GATE';
  tracking_id: string;
  order_size: 'Regular' | 'Large' | '';
  phone: string;
  full_name: string;
  hostel_block: string;
}

const initialFormState: FormState = {
  pickup_point: 'AMAZON_KIOSK',
  tracking_id: '',
  order_size: 'Regular',
  phone: '',
  full_name: '',
  hostel_block: '',
};

export default function OrderManager() {
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pricing: Base Fee ₹20, Large surcharge +₹10
  const baseFee = 20;
  const surcharge = formData.order_size === 'Large' ? 10 : 0;
  const deliveryFee = baseFee + surcharge;

  // Fetch current authenticated user's UUID from Supabase
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setErrorMsg('User not authenticated. Please log in.');
        return;
      }

      setUserId(user.id);
    };

    fetchUser();
  }, []);

  // Fetch orders and subscribe to real-time updates once userId is available
  useEffect(() => {
    if (!userId) return;

    const fetchActiveOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch orders:', error.message);
      } else if (data) {
        setOrders(data as Order[]);
      }
    };

    fetchActiveOrders();

    const channel = supabase
      .channel(`realtime-orders-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `requester_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new as Order, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((order) =>
                (order as { id: string }).id === (payload.new as { id: string }).id
                  ? (payload.new as Order)
                  : order
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) =>
              prev.filter(
                (order) =>
                  (order as { id: string }).id !== (payload.old as { id: string }).id
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const sanitized = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: sanitized }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!userId) {
      setErrorMsg('User not authenticated. Please log in.');
      return;
    }

    if (formData.pickup_point === 'AMAZON_KIOSK' && !formData.tracking_id.trim()) {
      setErrorMsg('tracking id not entered. Please enter tracking id');
      return;
    }

    if (!formData.order_size) {
      setErrorMsg('order size not entered. Please enter order size');
      return;
    }

    if (!formData.phone.trim()) {
      setErrorMsg('phone not entered. Please enter phone');
      return;
    }

    if (formData.phone.length < 10) {
      setErrorMsg('phone not entered. Please enter phone (10 digits)');
      return;
    }

    if (!formData.full_name.trim()) {
      setErrorMsg('full name not entered. Please enter full name');
      return;
    }

    if (!formData.hostel_block.trim()) {
      setErrorMsg('hostel block not entered. Please enter hostel block');
      return;
    }

    setLoading(true);

    // Random 4-digit verification PIN for rider handover
    const delivery_pin = Math.floor(1000 + Math.random() * 9000).toString();

    // Random 6-digit pickup OTP generated for every order
    const random_pickup_otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newOrderPayload = {
      requester_id: userId,
      pickup_location: formData.pickup_point,
      tracking_id:
        formData.pickup_point === 'AMAZON_KIOSK'
          ? formData.tracking_id.trim()
          : null,
      pickup_otp: random_pickup_otp,
      order_size: formData.order_size,
      phone: formData.phone,
      full_name: formData.full_name.trim(),
      hostel_block: formData.hostel_block.trim().toUpperCase(),
      delivery_pin,
      delivery_fee: deliveryFee,
      is_prepaid: true,
      status: 'PENDING',
      status_update: 'Order created. Searching for nearby riders...',
    };

    const { error } = await supabase.from('orders').insert([newOrderPayload]);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setFormData(initialFormState);
    }

    setLoading(false);
  };

  return (
    <main className="w-full max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col text-slate-900 pb-12 antialiased">
      {/* App Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 flex items-center justify-between">
        <h1 className="text-base font-bold tracking-tight text-slate-900">
          Campus Delivery Request
        </h1>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
          Live PWA
        </span>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Order Form Card */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Create New Order
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Step 1: Pick-Up Point Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Order Pick-Up Point
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, pickup_point: 'AMAZON_KIOSK' }))
                  }
                  className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition text-center ${
                    formData.pickup_point === 'AMAZON_KIOSK'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Amazon Kiosk
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      pickup_point: 'MAIN_GATE',
                      tracking_id: '',
                    }))
                  }
                  className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition text-center ${
                    formData.pickup_point === 'MAIN_GATE'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Main Gate
                </button>
              </div>
            </div>

            {/* Compulsory Tracking ID for Amazon Kiosk */}
            {formData.pickup_point === 'AMAZON_KIOSK' && (
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Amazon Tracking ID / Order ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="tracking_id"
                  placeholder="e.g. 403-1234567-8901234"
                  value={formData.tracking_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition"
                />
              </div>
            )}

            <hr className="border-slate-100" />

            {/* Step 2: Order Description */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Order Description
              </p>

              {/* Size Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">
                    Size <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Base: ₹20 {formData.order_size === 'Large' && '+ ₹10 Surcharge'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, order_size: 'Regular' }))
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition ${
                      formData.order_size === 'Regular'
                        ? 'border-slate-900 bg-slate-100 text-slate-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    Regular (₹20)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, order_size: 'Large' }))
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition ${
                      formData.order_size === 'Large'
                        ? 'border-slate-900 bg-slate-100 text-slate-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    Large (₹30)
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  placeholder="Full name of recipient"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition"
                />
              </div>

              {/* Hostel Block */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Hostel Block <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="hostel_block"
                  placeholder="e.g. Block Q, PRP, Room 402"
                  value={formData.hostel_block}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition"
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5 font-medium">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !userId}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-slate-900 text-white font-medium text-sm shadow active:scale-[0.99] disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? 'Submitting...' : `Confirm Request (₹${deliveryFee})`}
            </button>
          </form>
        </section>

        {/* Active Orders List */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 px-1">
            My Active Requests
          </h2>

          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
              <p className="text-sm text-slate-400">No active delivery requests found.</p>
            </div>
          ) : (
            orders.map((order: any) => {
              const isActive =
                order.status === 'PENDING' ||
                order.status === 'ALLOCATED' ||
                order.status === 'PICKED_UP';

              return (
                <article
                  key={order.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-base">
                        {order.full_name || 'Delivery Request'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {order.order_size} Package •{' '}
                        {order.pickup_location === 'AMAZON_KIOSK'
                          ? 'Amazon Kiosk'
                          : 'Main Gate'}
                      </p>
                      {order.tracking_id && (
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          ID: {order.tracking_id}
                        </p>
                      )}
                    </div>

                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        order.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : order.status === 'ALLOCATED'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'PICKED_UP'
                          ? 'bg-purple-100 text-purple-800'
                          : order.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Real-time status message from rider */}
                  {order.status_update && (
                    <div className="p-2.5 bg-blue-50/80 border border-blue-100 rounded-xl flex items-start gap-2 text-xs text-blue-900">
                      <span className="relative flex h-2 w-2 mt-1 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                      </span>
                      <div>
                        <span className="font-semibold text-blue-950 block text-[11px] uppercase tracking-wider">
                          Rider Status Update
                        </span>
                        <p className="text-xs text-blue-900/90 mt-0.5 leading-snug">
                          {order.status_update}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Delivery verification PIN */}
                  {isActive && order.delivery_pin && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                          Rider Delivery PIN
                        </p>
                        <p className="text-xs text-indigo-700">
                          Share this with rider upon arrival
                        </p>
                      </div>
                      <span className="text-2xl font-mono font-black tracking-widest text-indigo-600">
                        {order.delivery_pin}
                      </span>
                    </div>
                  )}

                  {/* Auto-generated Pickup OTP Display */}
                  {order.pickup_otp && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-amber-900 font-medium">
                        Pickup OTP (for kiosk collection):
                      </span>
                      <span className="font-mono font-bold tracking-wider text-amber-950 text-sm">
                        {order.pickup_otp}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>
                      <span className="text-slate-400">Hostel Block:</span>{' '}
                      <span className="font-medium text-slate-700">{order.hostel_block}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Phone:</span>{' '}
                      <span className="font-medium text-slate-700">{order.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Fee:</span>{' '}
                      <span className="font-medium text-emerald-700 font-semibold">
                        ₹{order.delivery_fee}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Pickup:</span>{' '}
                      <span className="font-medium text-slate-700">
                        {order.pickup_location === 'AMAZON_KIOSK'
                          ? 'Amazon Kiosk'
                          : 'Main Gate'}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}