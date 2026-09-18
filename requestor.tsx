'use client';

import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from 'react';

import supabase from './supabase';
import { Order } from './type';

type AppStep =
  | 'PICKUP_SELECT'
  | 'ORDER_FORM'
  | 'ACTIVE_REQUESTS';

type PickupPoint =
  | 'AMAZON_KIOSK'
  | 'MAIN_GATE';

type OrderSize =
  | 'Regular'
  | 'Large'
  | '';

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
  pickup_point: 'AMAZON_KIOSK',
  tracking_id: '',
  order_size: '',
  order_description: '',
  phone: '',
  full_name: '',
  hostel_block: '',
  handling_instructions: '',
  order_instruction: '',
  special_delivery_instruction: '',
};

export default function OrderManager() {
  const [step, setStep] =
    useState<AppStep>('PICKUP_SELECT');

  const [userId, setUserId] =
    useState<string | null>(null);

  const [formData, setFormData] =
    useState<FormState>(initialFormState);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const deliveryFee =
    formData.order_size === 'Large'
      ? 30
      : 20;

  /*
   * ============================================================
   * GET CURRENT USER
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const getUser = async () => {
      const {
        data,
        error,
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (error || !data.user) {
        setErrorMsg(
          'User not authenticated. Please log in.'
        );
        return;
      }

      setUserId(data.user.id);
    };

    getUser();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * FETCH ORDERS + REALTIME
   * ============================================================
   */

  useEffect(() => {
    if (!userId) {
      return;
    }

    let mounted = true;

    const fetchOrders = async () => {
      const {
        data,
        error,
      } = await supabase
        .from('orders')
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', {
          ascending: false,
        });

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(
          'Failed to fetch orders:',
          error.message
        );
        return;
      }

      if (data) {
        setOrders(data as Order[]);
      }
    };

    fetchOrders();

    const channel = supabase
      .channel(`orders-${userId}`)
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
            const newOrder =
              payload.new as Order;

            setOrders((current) => [
              newOrder,
              ...current,
            ]);

            return;
          }

          if (payload.eventType === 'UPDATE') {
            const updatedOrder =
              payload.new as Order;

            const updatedId = (
              updatedOrder as Order & {
                id: string;
              }
            ).id;

            setOrders((current) =>
              current.map((order) => {
                const orderId = (
                  order as Order & {
                    id: string;
                  }
                ).id;

                return orderId === updatedId
                  ? updatedOrder
                  : order;
              })
            );

            return;
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = (
              payload.old as {
                id: string;
              }
            ).id;

            setOrders((current) =>
              current.filter((order) => {
                const orderId = (
                  order as Order & {
                    id: string;
                  }
                ).id;

                return orderId !== deletedId;
              })
            );
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /*
   * ============================================================
   * INPUT CHANGE
   * ============================================================
   */

  const handleInputChange = (
    event: ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement |
      HTMLTextAreaElement
    >
  ) => {
    const {
      name,
      value,
    } = event.target;

    if (name === 'phone') {
      const cleanedPhone = value
        .replace(/\D/g, '')
        .slice(0, 10);

      setFormData((current) => ({
        ...current,
        phone: cleanedPhone,
      }));

      return;
    }

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /*
   * ============================================================
   * PICKUP SELECTION
   * ============================================================
   */

  const handlePickupSelection = (
    point: PickupPoint
  ) => {
    setFormData((current) => ({
      ...current,
      pickup_point: point,
      tracking_id:
        point === 'MAIN_GATE'
          ? ''
          : current.tracking_id,
    }));

    setErrorMsg(null);
    setStep('ORDER_FORM');
  };

  /*
   * ============================================================
   * VALIDATION
   * ============================================================
   */

  const validateForm = (): boolean => {
    if (
      formData.pickup_point ===
        'AMAZON_KIOSK' &&
      !formData.tracking_id.trim()
    ) {
      setErrorMsg(
        'Tracking ID is required for Amazon Kiosk.'
      );

      return false;
    }

    if (!formData.order_size) {
      setErrorMsg(
        'Please select an order size.'
      );

      return false;
    }

    if (
      !formData.order_description.trim()
    ) {
      setErrorMsg(
        'Please enter the order description.'
      );

      return false;
    }

    if (
      formData.phone.length !== 10
    ) {
      setErrorMsg(
        'Please enter a valid 10-digit phone number.'
      );

      return false;
    }

    if (!formData.full_name.trim()) {
      setErrorMsg(
        'Please enter the full name.'
      );

      return false;
    }

    if (!formData.hostel_block.trim()) {
      setErrorMsg(
        'Please enter the hostel block / room.'
      );

      return false;
    }

    if (
      !formData.handling_instructions.trim()
    ) {
      setErrorMsg(
        'Please enter the handling instructions.'
      );

      return false;
    }

    if (
      !formData.order_instruction.trim()
    ) {
      setErrorMsg(
        'Please enter the order instruction.'
      );

      return false;
    }

    if (
      !formData.special_delivery_instruction.trim()
    ) {
      setErrorMsg(
        'Please enter the special delivery instruction.'
      );

      return false;
    }

    return true;
  };

  /*
   * ============================================================
   * SUBMIT ORDER
   * ============================================================
   */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMsg(null);

    if (!userId) {
      setErrorMsg(
        'User not authenticated. Please log in.'
      );

      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const pickupOtp = Math.floor(
      100000 +
        Math.random() * 900000
    ).toString();

    const deliveryPin = Math.floor(
      1000 +
        Math.random() * 9000
    ).toString();

    const payload = {
      requester_id: userId,

      pickup_location:
        formData.pickup_point,

      tracking_id:
        formData.pickup_point ===
        'AMAZON_KIOSK'
          ? formData.tracking_id.trim()
          : null,

      pickup_otp: pickupOtp,

      order_size:
        formData.order_size,

      order_description:
        formData.order_description.trim(),

      phone:
        formData.phone,

      full_name:
        formData.full_name.trim(),

      hostel_block:
        formData.hostel_block
          .trim()
          .toUpperCase(),

      handling_instructions:
        formData.handling_instructions.trim(),

      order_instruction:
        formData.order_instruction.trim(),

      special_delivery_instruction:
        formData.special_delivery_instruction.trim(),

      delivery_pin:
        deliveryPin,

      delivery_fee:
        deliveryFee,

      is_prepaid:
        true,

      status:
        'PENDING',

      status_update:
        'Order created. Searching for nearby riders...',
    };

    const {
      error,
    } = await supabase
      .from('orders')
      .insert([payload]);

    if (error) {
      console.error(
        'Order creation failed:',
        error.message
      );

      setErrorMsg(error.message);
      setLoading(false);

      return;
    }

    setFormData(initialFormState);
    setLoading(false);
    setStep('ACTIVE_REQUESTS');
  };

  /*
   * ============================================================
   * SCREEN 1 - PICKUP SELECTION
   * ============================================================
   */

  if (step === 'PICKUP_SELECT') {
    return (
      <main className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <section className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-10">

          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-xl">
              <span className="text-4xl">
                🚚
              </span>
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
              OnMyWay
            </p>

            <h1 className="text-3xl font-black tracking-tight">
              Requestor Dashboard
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-300">
              Request a campus delivery quickly
              and track your order in real time.
            </p>
          </div>

          <div className="space-y-4">

            <button
              type="button"
              onClick={() =>
                handlePickupSelection(
                  'AMAZON_KIOSK'
                )
              }
              className="group w-full rounded-3xl border border-white/10 bg-white p-6 text-left text-slate-900 shadow-2xl transition duration-200 hover:-translate-y-1 hover:shadow-white/10 active:scale-[0.98]"
            >
              <div className="flex items-center gap-5">

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
                  📦
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black">
                    Amazon Kiosk
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Tracking ID required
                  </p>
                </div>

                <span className="text-2xl font-bold text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700">
                  →
                </span>

              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                handlePickupSelection(
                  'MAIN_GATE'
                )
              }
              className="group w-full rounded-3xl border border-white/10 bg-white p-6 text-left text-slate-900 shadow-2xl transition duration-200 hover:-translate-y-1 hover:shadow-white/10 active:scale-[0.98]"
            >
              <div className="flex items-center gap-5">

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
                  🚪
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black">
                    Main Gate
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Tracking ID optional
                  </p>
                </div>

                <span className="text-2xl font-bold text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700">
                  →
                </span>

              </div>
            </button>

          </div>

          {errorMsg && (
            <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
              <p className="text-sm font-medium text-rose-200">
                {errorMsg}
              </p>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-slate-500">
            Fast • Simple • Live Campus Delivery
          </p>

        </section>
      </main>
    );
  }

  /*
   * ============================================================
   * SCREEN 2 - ORDER FORM
   * ============================================================
   */

  if (step === 'ORDER_FORM') {
    return (
      <main className="min-h-screen w-full bg-slate-50 text-slate-900">

        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur">
          <div className="mx-auto flex w-full max-w-lg items-center gap-4">

            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setStep('PICKUP_SELECT');
              }}
              className="flex min-h-12 items-center rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200 active:scale-95"
            >
              ← Back
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                OnMyWay
              </p>

              <h1 className="truncate text-lg font-black">
                Delivery Request
              </h1>

              <p className="text-xs text-slate-500">
                {formData.pickup_point ===
                'AMAZON_KIOSK'
                  ? 'Amazon Kiosk'
                  : 'Main Gate'}
              </p>
            </div>

          </div>
        </header>

        <section className="mx-auto w-full max-w-lg px-4 py-6">

          <div className="mb-6 rounded-3xl bg-slate-900 p-5 text-white shadow-xl">

            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Pickup Point
            </p>

            <div className="mt-2 flex items-center justify-between gap-4">

              <div>
                <p className="text-xl font-black">
                  {formData.pickup_point ===
                  'AMAZON_KIOSK'
                    ? '📦 Amazon Kiosk'
                    : '🚪 Main Gate'}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {formData.pickup_point ===
                  'AMAZON_KIOSK'
                    ? 'Amazon delivery pickup'
                    : 'Main campus gate pickup'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep('PICKUP_SELECT');
                }}
                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
              >
                Change
              </button>

            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4"
          >

            {formData.pickup_point ===
              'AMAZON_KIOSK' && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">

                <label
                  htmlFor="tracking_id"
                  className="mb-2 block text-sm font-bold text-amber-950"
                >
                  Amazon Tracking ID / Order ID
                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <input
                  id="tracking_id"
                  name="tracking_id"
                  type="text"
                  value={
                    formData.tracking_id
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="e.g. 403-1234567-8901234"
                  required
                  className="min-h-14 w-full rounded-2xl border border-amber-200 bg-white px-4 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />

              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

              <label className="mb-3 block text-sm font-bold text-slate-700">
                Order Size
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setFormData(
                      (current) => ({
                        ...current,
                        order_size:
                          'Regular',
                      })
                    )
                  }
                  className={`min-h-20 rounded-2xl border-2 px-4 py-3 text-base font-black transition active:scale-[0.98] ${
                    formData.order_size ===
                    'Regular'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  Regular
                  <span className="mt-1 block text-sm font-medium opacity-70">
                    ₹20
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData(
                      (current) => ({
                        ...current,
                        order_size:
                          'Large',
                      })
                    )
                  }
                  className={`min-h-20 rounded-2xl border-2 px-4 py-3 text-base font-black transition active:scale-[0.98] ${
                    formData.order_size ===
                    'Large'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  Large
                  <span className="mt-1 block text-sm font-medium opacity-70">
                    ₹30
                  </span>
                </button>

              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

              <label
                htmlFor="order_description"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Order Description
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <input
                id="order_description"
                name="order_description"
                type="text"
                value={
                  formData.order_description
                }
                onChange={
                  handleInputChange
                }
                placeholder="e.g. Shoe box, grocery bag, electronics"
                required
                className="min-h-14 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />

            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Phone Number
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={
                  formData.phone
                }
                onChange={
                  handleInputChange
                }
                placeholder="10-digit mobile number"
                required
                className="min-h-14 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />

            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

              <label
                htmlFor="full_name"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Full Name
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <input
                id="full_name"
                name="full_name"
                type="text"
                value={
                  formData.full_name
                }
                onChange={
                  handleInputChange
                }
                placeholder="Full name of recipient"
                required
                className="min-h-14 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />

            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

              <label
                htmlFor="hostel_block"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Hostel Block / Room
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <input
                id="hostel_block"
                name="hostel_block"
                type="text"
                value={
                  formData.hostel_block
                }
                onChange={
                  handleInputChange
                }
                placeholder="e.g. Block Q, PRP, Room 402"
                required
                className="min-h-14 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />

            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

              <label
                htmlFor="handling_instructions"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Handling Instructions
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <textarea
                id="handling_instructions"
                name="handling_instructions"
                rows={3}
                value={
                  formData.handling_instructions
                }
                onChange={
                  handleInputChange
                }
                placeholder="e.g. Handle with care, fragile item"
                required
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />

            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

              <label
                htmlFor="order_instruction"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Order Instruction
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <textarea
                id="order_instruction"
                name="order_instruction"
                rows={3}
                value={
                  formData.order_instruction
                }
                onChange={
                  handleInputChange
                }
                placeholder="e.g. Call upon arrival"
                required
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />

            </div>

            {/* =================================================
                NEW FIELD
               ================================================= */}

            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">

              <div className="mb-3 flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-xl">
                  💬
                </div>

                <div>
                  <label
                    htmlFor="special_delivery_instruction"
                    className="block text-sm font-black text-blue-950"
                  >
                    Special Delivery Instruction
                    <span className="ml-1 text-rose-500">
                      *
                    </span>
                  </label>

                  <p className="mt-0.5 text-xs text-blue-700">
                    Tell the rider anything
                    important about your delivery.
                  </p>
                </div>

              </div>

              <textarea
                id="special_delivery_instruction"
                name="special_delivery_instruction"
                rows={4}
                value={
                  formData.special_delivery_instruction
                }
                onChange={
                  handleInputChange
                }
                placeholder="e.g. Please call me before coming to the hostel. Do not leave the package outside."
                required
                className="w-full resize-none rounded-2xl border border-blue-200 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10"
              />

            </div>

            {errorMsg && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-700">
                  {errorMsg}
                </p>
              </div>
            )}

            <div className="rounded-3xl bg-slate-100 p-5">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Delivery Fee
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {formData.order_size ===
                    'Large'
                      ? 'Large delivery'
                      : 'Regular delivery'}
                  </p>
                </div>

                <span className="text-3xl font-black text-slate-900">
                  ₹{deliveryFee}
                </span>

              </div>

            </div>

            <button
              type="submit"
              disabled={
                loading || !userId
              }
              className="min-h-16 w-full rounded-3xl bg-slate-950 px-5 text-base font-black text-white shadow-xl transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Submitting Request...'
                : `Confirm Delivery Request • ₹${deliveryFee}`}
            </button>

          </form>

          <p className="py-6 text-center text-xs text-slate-400">
            OnMyWay • Campus Delivery
          </p>

        </section>
      </main>
    );
  }

  /*
   * ============================================================
   * SCREEN 3 - ACTIVE REQUESTS
   * ============================================================
   */

  const activeOrders = orders.filter(
    (order: any) =>
      order.status === 'PENDING' ||
      order.status === 'ALLOCATED' ||
      order.status === 'PICKED_UP'
  );

  return (
    <main className="min-h-screen w-full bg-slate-50 text-slate-900">

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur">

        <div className="mx-auto flex w-full max-w-lg items-center justify-between">

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              OnMyWay
            </p>

            <h1 className="text-xl font-black">
              Requestor Dashboard
            </h1>

            <p className="mt-0.5 text-xs text-slate-500">
              Live delivery tracking
            </p>
          </div>

          <span className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live
          </span>

        </div>

      </header>

      <section className="mx-auto w-full max-w-lg space-y-4 px-4 py-6">

        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setFormData(
              initialFormState
            );
            setStep('PICKUP_SELECT');
          }}
          className="min-h-14 w-full rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 active:scale-[0.98]"
        >
          + Create New Delivery Request
        </button>

        {activeOrders.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              📦
            </div>

            <h2 className="mt-5 text-lg font-black">
              No Active Requests
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your active delivery requests
              will appear here.
            </p>

            <button
              type="button"
              onClick={() =>
                setStep('PICKUP_SELECT')
              }
              className="mt-6 min-h-12 rounded-2xl bg-slate-950 px-6 text-sm font-bold text-white"
            >
              Create Request
            </button>

          </div>
        )}

        {activeOrders.map(
          (order: any) => {

            let statusClass =
              'bg-slate-100 text-slate-700';

            if (
              order.status === 'PENDING'
            ) {
              statusClass =
                'bg-amber-100 text-amber-800';
            }

            if (
              order.status === 'ALLOCATED'
            ) {
              statusClass =
                'bg-blue-100 text-blue-800';
            }

            if (
              order.status === 'PICKED_UP'
            ) {
              statusClass =
                'bg-purple-100 text-purple-800';
            }

            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >

                <div className="border-b border-slate-100 p-5">

                  <div className="flex items-start justify-between gap-4">

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Delivery Request
                      </p>

                      <h2 className="mt-1 text-lg font-black">
                        {order.full_name ||
                          'Delivery Request'}
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        {order.pickup_location ===
                        'AMAZON_KIOSK'
                          ? '📦 Amazon Kiosk'
                          : '🚪 Main Gate'}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${statusClass}`}
                    >
                      {order.status}
                    </span>

                  </div>

                </div>

                {order.status_update && (
                  <div className="mx-5 mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">

                    <div className="flex items-center gap-2">

                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
                        🚴
                      </span>

                      <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                        Rider Status
                      </p>

                    </div>

                    <p className="mt-3 text-sm leading-6 text-blue-950">
                      {order.status_update}
                    </p>

                  </div>
                )}

                {order.order_description && (
                  <div className="mx-5 mt-4 rounded-2xl bg-slate-50 p-4">

                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Item Description
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {order.order_description}
                    </p>

                  </div>
                )}

                {order.pickup_otp && (
                  <div className="mx-5 mt-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4">

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                        Pickup OTP
                      </p>

                      <p className="mt-1 text-xs text-amber-800">
                        Give this to the rider
                      </p>
                    </div>

                    <span className="font-mono text-2xl font-black tracking-[0.2em] text-amber-950">
                      {order.pickup_otp}
                    </span>

                  </div>
                )}

                {order.delivery_pin && (
                  <div className="mx-5 mt-4 flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 p-4">

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                        Delivery PIN
                      </p>

                      <p className="mt-1 text-xs text-indigo-800">
                        Share with rider
                      </p>
                    </div>

                    <span className="font-mono text-2xl font-black tracking-[0.2em] text-indigo-950">
                      {order.delivery_pin}
                    </span>

                  </div>
                )}

                <div className="mx-5 mt-4 grid grid-cols-2 gap-3">

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Pickup
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-700">
                      {order.pickup_location ===
                      'AMAZON_KIOSK'
                        ? 'Amazon Kiosk'
                        : 'Main Gate'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Size
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-700">
                      {order.order_size}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Hostel
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-700">
                      {order.hostel_block}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Phone
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-700">
                      {order.phone}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                      Fee
                    </p>

                    <p className="mt-1 text-xs font-black text-emerald-700">
                      ₹{order.delivery_fee}
                    </p>
                  </div>

                  {order.tracking_id && (
                    <div className="rounded-2xl bg-slate-50 p-3">

                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Tracking ID
                      </p>

                      <p className="mt-1 break-all font-mono text-[10px] font-semibold text-slate-700">
                        {order.tracking_id}
                      </p>

                    </div>
                  )}

                </div>

                {order.handling_instructions && (
                  <div className="mx-5 mt-4 rounded-2xl bg-slate-50 p-4">

                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Handling Instructions
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {order.handling_instructions}
                    </p>

                  </div>
                )}

                {order.order_instruction && (
                  <div className="mx-5 mt-4 rounded-2xl bg-slate-50 p-4">

                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Order Instruction
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {order.order_instruction}
                    </p>

                  </div>
                )}

                {order.special_delivery_instruction && (
                  <div className="mx-5 mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">

                    <div className="flex items-center gap-2">

                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
                        💬
                      </span>

                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                        Special Delivery Instruction
                      </p>

                    </div>

                    <p className="mt-3 text-sm leading-6 text-blue-950">
                      {order.special_delivery_instruction}
                    </p>

                  </div>
                )}

                <div className="h-5" />

              </article>
            );
          }
        )}

      </section>
    </main>
  );
}