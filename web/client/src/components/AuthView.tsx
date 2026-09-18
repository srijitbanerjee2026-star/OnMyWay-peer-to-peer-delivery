import React, { useState } from 'react';
import { supabase } from '../supabase';
import { ShieldCheck, Lock, Mail, User, Phone, Home, CreditCard, Hash, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [upiVpa, setUpiVpa] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

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

        // 1. Upload ID card to Supabase Storage bucket 'id-cards'
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

        // 2. Register user in Supabase Auth
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('Failed to register user.');

        // 3. Insert record into your custom 'users' table
        const { error: insertError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: normalizedEmail,
          full_name: fullName.trim(),
          reg_number: regNumber.trim().toUpperCase(),
          phone: phone.trim(),
          hostel_block: hostelBlock.trim(),
          room_number: roomNumber.trim(),
          upi_vpa: upiVpa.trim() || null,
          id_card_url: urlData.publicUrl,
          is_verified: false
        });

        if (insertError) throw new Error(`User profile creation failed: ${insertError.message}`);

        alert('Registration complete! Logging in...');
        if (onAuthSuccess) onAuthSuccess();
      } else {
        // Standard Sign In
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
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', padding: 12, borderRadius: 50, background: '#eff6ff', color: '#2563eb', marginBottom: 8 }}>
          <ShieldCheck size={28} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '4px 0', color: '#0f172a' }}>
          {isSignUp ? 'VIT Student Registration' : 'Sign In to OnMyWay'}
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
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

            <div style={{ position: 'relative' }}>
              <CreditCard size={16} style={{ position: 'absolute', top: 12, left: 10, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="UPI ID for Rider Payouts (e.g. name@okaxis)"
                value={upiVpa}
                onChange={e => setUpiVpa(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 34px', borderRadius: 6, border: '1px solid #cbd5e1' }}
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

      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13 }}>
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