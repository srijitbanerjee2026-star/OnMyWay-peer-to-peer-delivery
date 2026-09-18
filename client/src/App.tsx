import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import AuthView from './components/AuthView';
import RequesterView from './components/RequesterView';
import RiderView from './components/RiderView';
import { Package, Bike, LogOut } from 'lucide-react';
import type { Order } from './types';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<'REQUESTER' | 'RIDER'>('REQUESTER');
  const [orders, setOrders] = useState<Order[]>([]);

  // 1. Listen for Supabase Authentication state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch live orders from Supabase
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
  };

  // 3. Realtime listener: auto-update feed when records change
  useEffect(() => {
    if (!session) return;
    fetchOrders();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Unauthenticated screen: forces user to Sign In / Sign Up with VIT ID upload
  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', background: '#f1f5f9', padding: '16px 0' }}>
        <div style={{ width: '100%', maxWidth: 430, background: '#ffffff', minHeight: '90vh', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          <AuthView onAuthSuccess={() => fetchOrders()} />
        </div>
      </div>
    );
  }

  // Authenticated PWA Screen
  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', background: '#f1f5f9', padding: '16px 0' }}>
      <div style={{ width: '100%', maxWidth: 430, background: '#ffffff', minHeight: '90vh', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Navigation Header */}
        <header style={{ padding: '14px 16px', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.5 }}>OnMyWay</span>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{session.user.email}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button 
              onClick={() => setRole('REQUESTER')} 
              style={{ padding: '6px 10px', fontSize: 12, background: role === 'REQUESTER' ? '#2563eb' : '#334155', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Package size={13} /> Requester
            </button>
            <button 
              onClick={() => setRole('RIDER')} 
              style={{ padding: '6px 10px', fontSize: 12, background: role === 'RIDER' ? '#16a34a' : '#334155', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Bike size={13} /> Rider
            </button>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              style={{ padding: '6px 8px', background: '#475569', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </header>

        {/* View Switcher: Dev 2 (Requester) vs Dev 3 (Rider) */}
        <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
          {role === 'REQUESTER' ? (
            <RequesterView
              userId={session.user.id}
              userName={session.user.user_metadata?.full_name || ''}
              orders={orders}
              onOrderCreated={fetchOrders}
            />
          ) : (
            <RiderView
              userId={session.user.id}
              orders={orders}
              onOrderUpdated={fetchOrders}
            />
          )}
        </div>
      </div>
    </div>
  );
}