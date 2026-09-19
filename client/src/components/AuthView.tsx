import React, { useState } from 'react';
import { supabase } from '../supabase';
import { ShieldCheck, Lock, Mail, User, Phone, Home, Hash, UploadCloud, CheckCircle, AlertCircle, Zap } from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess?: () => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [hostelBlock, setHostelBlock] = useState('Q');
  const [roomNumber, setRoomNumber] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDemoBypass = () => {
    localStorage.setItem('demo_session', JSON.stringify({
      id: 'demo-student-01',
      email: 'srijit.2026@vitstudent.ac.in',
      reg_number: '24BCE1000',
      full_name: 'Srijit (VIT Student)'
    }));
    if (onAuthSuccess) onAuthSuccess();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.endsWith('@vitstudent.ac.in')) {
      setErrorMsg('Access restricted: You must use an official @vitstudent.ac.in email.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        if (!idFile) {
          throw new Error('Please upload your Student ID Card photo.');
        }

        const fileExt = idFile.name.split('.').pop();
        const fileName = `${Date.now()}_${regNumber.trim().toUpperCase()}.${fileExt}`;
        const filePath = `student-ids/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('id-cards')
          .upload(filePath, idFile);

        if (uploadError) throw new Error(`ID upload failed: ${uploadError.message}`);

        const { data: urlData } = supabase.storage
          .from('id-cards')
          .getPublicUrl(filePath);

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('Failed to register user.');

        const { error: insertError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: normalizedEmail,
          full_name: fullName.trim(),
          reg_number: regNumber.trim().toUpperCase(),
          phone: phone.trim(),
          hostel_block: hostelBlock.trim(),
          room_number: roomNumber.trim(),
          id_card_url: urlData.publicUrl,
          is_verified: false
        });

        if (insertError) throw new Error(`User profile creation failed: ${insertError.message}`);

        alert('Registration complete! Logging in...');
        if (onAuthSuccess) onAuthSuccess();
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });

        if (signInError) throw signInError;
        if (onAuthSuccess) onAuthSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* Fast-Track Evaluation Bypass */}
      <div style={{
        marginBottom: 18,
        padding: '12px 14px',
        background: '#eff6ff',
        border: '2px dashed #2563eb',
        borderRadius: 10,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Zap size={15} /> Evaluation Fast-Track
        </div>
        <p style={{ fontSize: 11, color: '#3b82f6', margin: '4px 0 10px 0' }}>
          Bypass email verification & rate limits to preview the verified student flow.
        </p>
        <button
          type="button"
          onClick={handleDemoBypass}
          style={{
            width: '100%',
            padding: '9px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
          }}
        >
          Sign In as Verified Student (24BCE1000)
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ display: 'inline-flex', padding: 10, borderRadius: 50, background: '#eff6ff', color: '#2563eb', marginBottom: 6 }}>
          <ShieldCheck size={24} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '2px 0', color: '#0f172a' }}>
          {isSignUp ? 'VIT Student Registration' : 'Sign In to OnMyWay'}
        </h2>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
          {isSignUp ? 'Verify campus identity to claim & post deliveries' : 'Peer-to-peer campus delivery network'}
        </p>
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 6, background: '#fef2f2', color: '#dc2626', fontSize: 12, marginBottom: 14 }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isSignUp && (
          <>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', top: 12, left: 10, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Full Name (as on VIT ID)"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 34px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Hash size={16} style={{ position: 'absolute', top: 12, left: 10, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Reg No (e.g. 22BCE1024)"
                  value={regNumber}
                  onChange={e => setRegNumber(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 34px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  required
                />
              </div>
              <div style={{ position: 'relative', flex: 1 }}>
                <Phone size={16} style={{ position: 'absolute', top: 12, left: 10, color: '#94a3b8' }} />
                <input
                  type="tel"
                  placeholder="10-digit Phone"
                  value={phone}
                  maxLength={10}
                  onChange={e => setPhone(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 34px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Home size={16} style={{ position: 'absolute', top: 12, left: 10, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Hostel Block (e.g. Q)"
                  value={hostelBlock}
                  onChange={e => setHostelBlock(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 34px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Room No (e.g. 412)"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                style={{ width: 110, boxSizing: 'border-box', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}
                required
              />
            </div>
          </>
        )}

        <div style={{ position: 'relative' }}>
          <Mail size={16} style={{ position: 'absolute', top: 12, left: 10, color: '#94a3b8' }} />
          <input
            type="email"
            placeholder="regno@vitstudent.ac.in"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 34px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            required
          />
        </div>

        <div style={{ position: 'relative' }}>
          <Lock size={16} style={{ position: 'absolute', top: 12, left: 10, color: '#94a3b8' }} />
          <input
            type="password"
            placeholder="Password (minimum 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 34px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            required
          />
        </div>

        {isSignUp && (
          <div style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: 14, textAlign: 'center', background: '#f8fafc', marginTop: 2 }}>
            <input
              type="file"
              id="id-upload"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setIdFile(e.target.files[0]);
                }
              }}
              required
            />
            <label htmlFor="id-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {idFile ? (
                <>
                  <CheckCircle size={24} color="#16a34a" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{idFile.name}</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Click to replace ID photo</span>
                </>
              ) : (
                <>
                  <UploadCloud size={24} color="#64748b" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Upload Student ID Card Photo</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Front side of physical ID card</span>
                </>
              )}
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}
        >
          {loading ? 'Processing...' : isSignUp ? 'Submit Registration' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
        <span style={{ color: '#64748b' }}>
          {isSignUp ? 'Already registered? ' : 'New student? '}
        </span>
        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
          style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          {isSignUp ? 'Sign in' : 'Create an account'}
        </button>
      </div>
    </div>
  );
}