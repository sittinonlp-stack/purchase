/* global React */
// ============================
// Auth UI — Login / Register Screen
// ============================

function AuthScreen() {
  const [tab, setTab]           = React.useState('login');
  const [email, setEmail]       = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState('');
  const [success, setSuccess]   = React.useState('');

  const reset = () => { setError(''); setSuccess(''); };

  const handleLogin = async (e) => {
    e.preventDefault(); reset(); setLoading(true);
    const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    if (error) setError(thaiAuthError(error.message));
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault(); reset(); setLoading(true);
    if (!fullName.trim()) { setError('กรุณากรอกชื่อ-นามสกุล'); setLoading(false); return; }
    if (password.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); setLoading(false); return; }
    const { error } = await window.supabaseClient.auth.signUp({
      email, password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) { setError(thaiAuthError(error.message)); }
    else {
      setSuccess('สมัครสมาชิกสำเร็จ! รอผู้ดูแลระบบอนุมัติสิทธิ์ หรือเข้าสู่ระบบได้เลย');
      setTab('login');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: 'var(--bg, #f8f7f4)',
      fontFamily: 'Prompt, IBM Plex Sans Thai, sans-serif',
    }}>
      {/* Left panel — branding */}
      <div style={{
        width: 420, flexShrink: 0, background: '#111', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 48px', gap: 24,
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }} className="auth-left-panel">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg,#10b981,#047857)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, position: 'relative',
          }}>
            <svg width="26" height="26" viewBox="0 0 46 46" aria-hidden="true">
              <polygon points="23,7 5,23 41,23" fill="#ffffff"/>
              <rect x="10" y="21" width="26" height="18" rx="2" fill="#ffffff"/>
              <rect x="19" y="29" width="8" height="10" rx="1.5" fill="#047857"/>
            </svg>
            <span style={{
              position: 'absolute', right: -5, bottom: -5, width: 21, height: 21,
              borderRadius: '50%', background: '#f59e0b', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, lineHeight: 1,
            }}>฿</span>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>ForHouse Cost</div>
            <div style={{ color: '#34d399', fontSize: 12, fontWeight: 500 }}>คุมต้นทุนงานก่อสร้าง</div>
          </div>
        </div>

        <div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3 }}>
            คุมต้นทุน<br/>งานรับเหมาก่อสร้าง
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            จัดซื้อ · เช่าเครื่องจักร · ค่าแรง · รายรับ · เอกสารบัญชี
            ครบในที่เดียว พร้อมประวัติและรายงานสรุปทุกโครงการ
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {[
            ['🧾', 'จัดซื้อวัสดุ + เช่าเครื่องจักร'],
            ['👷', 'ค่าแรง + เงินประกันผลงาน'],
            ['💰', 'รายรับ · ตามบิล · เอกสารบัญชี'],
            ['📊', 'แดชบอร์ดสรุปทุกโครงการ'],
          ].map(([icon, text]) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.04)', borderRadius: 8,
              padding: '8px 14px', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 15 }}>{icon}</span>
              <span style={{ color: '#d1d5db', fontSize: 13 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', borderRadius: 12, background: '#f0ebe4',
            border: '1px solid #e2ddd8', padding: 4, marginBottom: 28, gap: 2,
          }}>
            {[['login','เข้าสู่ระบบ'], ['register','สมัครสมาชิก']].map(([t, label]) => (
              <button key={t} onClick={() => { setTab(t); reset(); }}
                style={{
                  flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                  borderRadius: 9, fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                  transition: 'all .15s',
                  background: tab === t ? '#fff' : 'transparent',
                  color: tab === t ? '#111' : '#7a6f64',
                  boxShadow: tab === t ? '0 1px 6px rgba(0,0,0,0.10)' : 'none',
                }}>
                {label}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', color: '#111' }}>
            {tab === 'login' ? 'ยินดีต้อนรับกลับ' : 'สร้างบัญชีใหม่'}
          </h2>
          <p style={{ color: '#7a6f64', fontSize: 13, margin: '0 0 24px' }}>
            {tab === 'login'
              ? 'กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งาน'
              : 'กรอกข้อมูลเพื่อขอสิทธิ์เข้าใช้งาน'}
          </p>

          {/* Error / Success */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>⚠️ {error}</div>
          )}
          {success && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#16a34a',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>✅ {success}</div>
          )}

          <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
            {/* Full name (register only) */}
            {tab === 'register' && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>ชื่อ-นามสกุล</label>
                <input className="input" type="text" placeholder="เกรียงไกร สุขสวัสดิ์"
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  required style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>อีเมล</label>
              <input className="input" type="email" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>รหัสผ่าน</label>
              <input className="input" type="password"
                placeholder={tab === 'register' ? 'อย่างน้อย 6 ตัวอักษร' : '••••••••'}
                value={password} onChange={e => setPassword(e.target.value)}
                required style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', gap: 8, fontSize: 15, padding: '12px 0' }}>
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
                    animation: 'spin 0.7s linear infinite' }} />
                  กำลังดำเนินการ…
                </>
              ) : tab === 'login' ? '🔑 เข้าสู่ระบบ' : '✉️ สมัครสมาชิก'}
            </button>
          </form>

          {tab === 'register' && (
            <p style={{ marginTop: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 }}>
              หลังสมัครแล้ว ผู้ดูแลระบบจะกำหนดสิทธิ์การเข้าถึงให้คุณ
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @media (max-width: 768px) { .auth-left-panel { display: none !important; } }
      `}</style>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
};

function thaiAuthError(msg) {
  if (!msg) return 'เกิดข้อผิดพลาด';
  if (msg.includes('Invalid login credentials')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (msg.includes('Email not confirmed'))       return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ';
  if (msg.includes('User already registered'))   return 'อีเมลนี้สมัครไว้แล้ว';
  if (msg.includes('Password should be'))        return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  if (msg.includes('Unable to validate'))        return 'รูปแบบอีเมลไม่ถูกต้อง';
  if (msg.includes('rate limit'))                return 'ลองใหม่อีกครั้งในอีกสักครู่';
  return msg;
}

window.AuthScreen = AuthScreen;
