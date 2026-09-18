import React, { useState } from 'react';
import { supabase } from '../supabase';
import { ShieldCheck, Lock, Mail, User, Phone, Home, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess?: () => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [hostelBlock, setHostelBlock] = useState('Block Q');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (!email.toLowerCase().endsWith('@vitstudent.ac.in')) {
      setErrorMsg('Access restricted: Must use an official @vitstudent.ac.in email.');
      setLoading(false);
      return;
    }

    if (isSignUp) {
      if (!idFile) {
        setErrorMsg('Please upload your Student ID Card photo.');
        setLoading(false);
        return;
      }

      if (phone.length < 10) {
        setErrorMsg('Please provide a valid 10-digit phone number.');
        setLoading(false);
        return;
      }

      // 1. Upload ID card file to Supabase Storage
      const fileExt = idFile.name.split('.').pop();
      const fileName = `${Date.now()}_${email.split('@')[0]}.${fileExt}`;
      const filePath = `student-ids/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('id-cards')
        .upload(filePath, idFile);

      if (uploadError) {
        setErrorMsg('ID Upload failed: ' + uploadError.message);
        setLoading(false);
        return;
      }

      // 2. Fetch public URL of the uploaded image
      const { data: urlData } = supabase.storage
        .from('id-cards')
        .getPublicUrl(filePath);

      // 3. Create user in Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            hostel_block: hostelBlock,
            id_card_url: urlData.publicUrl
          }
        }
      });

      if (signUpError) {
        setErrorMsg(signUpError.message);
        setLoading(false);
        return;
      }

      // 4. Insert row into public.profiles table
      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          email: email,
          full_name: fullName,
          phone: phone,
          hostel_block: hostelBlock,
          id_card_url: urlData.publicUrl,
          is_verified: false
        });

        if (profileError) {
          setErrorMsg('Profile creation error: ' + profileError.message);
          setLoading(false);
          return;
        }
      }

      alert('Registration successful! Logging in...');
      if (onAuthSuccess) onAuthSuccess();
    } else {
      // Returning user: Standard Sign In
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setErrorMsg(signInError.message);
      } else {
        if (onAuthSuccess) onAuthSuccess();
      }
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', padding: 12, borderRadius: 50, background: '#eff6ff', color: '#2563eb', marginBottom: 8 }}>
          <ShieldCheck size={28} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '4px 0', color: '#0f172a' }}>
          {isSignUp ? 'VIT Onboarding' : 'Sign In to OnMyWay'}
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          {isSignUp ? 'Complete profile and upload campus ID' : 'Peer-to-peer campus deliveries'}
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
                placeholder="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 34px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', top: 12, left: 10, color: '#94a3b8' }} />
              <input
                type="tel"
                placeholder="Phone Number (e.g. 9876543210)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 34px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Home size={16} style={{ position: 'absolute', top: 12, left: 10, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Hostel Block (e.g. Block Q, Block D, PRP)"
                value={hostelBlock}
                onChange={e => setHostelBlock(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 34px', borderRadius: 6, border: '1px solid #cbd5e1' }}
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
          <div style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: 14, textAlign: 'center', background: '#f8fafc', marginTop: 4 }}>
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
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{idFile.name} attached</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Click to change photo</span>
                </>
              ) : (
                <>
                  <UploadCloud size={24} color="#64748b" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Upload Student ID Card Photo</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Front side of physical ID card (PNG/JPG)</span>
                </>
              )}
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', marginTop: 6 }}
        >
          {loading ? 'Processing...' : isSignUp ? 'Submit Registration' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13 }}>
        <span style={{ color: '#64748b' }}>
          {isSignUp ? 'Already registered? ' : "New student? "}
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