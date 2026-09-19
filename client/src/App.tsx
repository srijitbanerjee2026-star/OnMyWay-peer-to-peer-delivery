import React, { useState } from 'react';
// @ts-ignore
import AuthView from './components/AuthView';
// @ts-ignore - traverses out of client/src into the root src/requestor folder
import RequestorApp from '../../src/requestor/RequestorApp';
// @ts-ignore - traverses out of client/src into the root src/rider folder
import RiderDashboard from '../../src/rider/RiderApp';
import { Package, Bike, KeyRound } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'AUTH' | 'REQUESTER' | 'RIDER'>('REQUESTER');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      {/* Global Navigation Header */}
      <header style={{ padding: '12px 20px', background: '#1e293b', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#38bdf8' }}>OnMyWay</span>
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>Campus P2P Logistics</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('AUTH')}
            style={{
              padding: '8px 12px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer',
              background: activeTab === 'AUTH' ? '#6366f1' : '#334155', color: '#fff', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <KeyRound size={14} /> Auth
          </button>
          <button
            onClick={() => setActiveTab('REQUESTER')}
            style={{
              padding: '8px 12px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer',
              background: activeTab === 'REQUESTER' ? '#2563eb' : '#334155', color: '#fff', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Package size={14} /> Requestor
          </button>
          <button
            onClick={() => setActiveTab('RIDER')}
            style={{
              padding: '8px 12px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer',
              background: activeTab === 'RIDER' ? '#16a34a' : '#334155', color: '#fff', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Bike size={14} /> Rider Pipeline
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 640, background: '#ffffff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          {activeTab === 'AUTH' && <AuthView onAuthSuccess={() => setActiveTab('REQUESTER')} />}
          {activeTab === 'REQUESTER' && <RequestorApp />}
          {activeTab === 'RIDER' && <RiderDashboard />}
        </div>
      </main>
    </div>
  );
}