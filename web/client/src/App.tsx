import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import AuthView from './components/AuthView';
import RequesterView from './components/RequesterView';
import RiderView from './components/RiderView';
import { Package, Bike, LogOut } from 'lucide-react';
import type { Order, User } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [role, setRole] = useState<'REQUESTER' | 'RIDER'>('REQUESTER');
  const [orders, setOrders] = useState<Order[]>([]);

  // 1. Sync authentication session & retrieve corresponding users table record
  const syncCurrentUser = async () => {
    setLoadingUser(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        setCurrentUser(profile as User);
      } else {
        // Fallback profile if user exists in auth.users but not public.users
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: 'VIT Student',
          reg_number: '',
          phone: '',
          hostel_block: 'Q',
          room_number: '',
          upi_vpa: null,
          id_card_url: null,
          is_verified: false,
          created_at: new Date().toISOString()
        });
      }
    } else {
      setCurrentUser(null);
    }
    setLoadingUser(false);
  };

  useEffect(() => {
    syncCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) syncCurrentUser();
      else {
        setCurrentUser(null);
        setLoadingUser(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch live orders
  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setOrders(data as Order[]);
  };

  // 3. Setup real-time postgres listener
  useEffect(() => {
    if (!currentUser) return;
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
  }, [currentUser]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loadingUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
        Loading session...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', background: '#f1f5f9', padding: '16px 0' }}>
        <div style={{ width: '100%', maxWidth: 430, background: '#ffffff', minHeight: '90vh', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          <AuthView onAuthSuccess={syncCurrentUser} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', background: '#f1f5f9', padding: '16px 0' }}>
      <div style={{ width: '100%', maxWidth: 430, background: '#ffffff', minHeight: '90vh', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Navigation Bar */}
        <header style={{ padding: '14px 16px', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.5 }}>OnMyWay</span>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{currentUser.reg_number || currentUser.email}</div>
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

        {/* View Switcher */}
        <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
          {role === 'REQUESTER' ? (
            <RequesterView
              user={currentUser}
              orders={orders}
              onOrderCreated={fetchOrders}
            />
          ) : (
            <RiderView
              user={currentUser}
              orders={orders}
              onOrderUpdated={fetchOrders}
            />
          )}
        </div>
      </div>
    </div>
  );
}