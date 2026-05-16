import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, LogIn, ShieldCheck, ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { resetPassword } from '../lib/firebase';

interface LoginProps {
  onLogin: (email?: string, password?: string) => void;
  agencyInfo?: {
    logo: string;
    name: string;
  };
  error?: string | null;
}

export default function Login({ onLogin, agencyInfo, error: loginError }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot-password'>('login');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password);
    } finally {
      // Small timeout to allow state transitions
      setTimeout(() => setLoading(false), 1000);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setResetError(null);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdff] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block p-5 bg-white rounded-[32px] shadow-2xl shadow-primary/10 border border-slate-50 mb-6"
          >
            {agencyInfo?.logo ? (
              <img src={agencyInfo.logo} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <ShieldCheck size={48} className="text-primary-metallic" />
            )}
          </motion.div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 mb-2 uppercase">
            SPJ <span className="text-primary-metallic">DIGITAL</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sistem Keuangan & Operasional v2.0</p>
        </div>

        <div className="glass-card bg-white p-10 rounded-[40px] shadow-2xl shadow-primary/5 border border-slate-100">
          <div className="space-y-6">
            {view === 'login' ? (
              <>
                {(loginError || resetError) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 items-start"
                  >
                    <div className="p-1 bg-red-100 rounded-lg text-red-600 shrink-0">
                      <Lock size={14} />
                    </div>
                    <p className="text-[10px] font-bold text-red-600 leading-relaxed uppercase tracking-tight">
                      {loginError || resetError}
                    </p>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Username / Email</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-primary transition-colors">
                        <User size={18} />
                      </div>
                      <input 
                        type="text" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        placeholder="Contoh: superadmin"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-primary transition-colors">
                        <Lock size={18} />
                      </div>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        placeholder="••••••••"
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-200 text-primary focus:ring-primary/20" />
                      <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-tight">Ingat Saya</span>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => { setView('forgot-password'); setResetSent(false); setResetError(null); }}
                      className="text-[11px] font-black text-primary uppercase tracking-tight hover:opacity-70"
                    >
                      Lupa Password?
                    </button>
                  </div>

                  <button 
                    id="btn-login-submit"
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group",
                      loading ? "opacity-70 cursor-not-allowed" : "hover:scale-[0.98] active:scale-95"
                    )}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Masuk ke Aplikasi
                        <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <button 
                    onClick={() => setView('login')}
                    className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-primary transition-colors"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Reset Password</h3>
                </div>

                {resetSent ? (
                  <div className="space-y-6 text-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail size={32} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Email Terkirim!</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Instruksi untuk merubah password telah dikirim ke email <strong>{email}</strong>. Silakan periksa kotak masuk atau folder spam Anda.</p>
                    </div>
                    <button 
                      onClick={() => setView('login')}
                      className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                    >
                      Kembali ke Login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-6">
                    <p className="text-[11px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight text-center">
                      Masukkan email yang terdaftar untuk menerima link reset password.
                    </p>
                    
                    {resetError && (
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-[10px] font-bold text-red-600 uppercase tracking-tight">
                        {resetError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Anda</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-primary transition-colors">
                          <User size={18} />
                        </div>
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                          placeholder="email@instansi.com"
                          required
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading || !email}
                      className={cn(
                        "w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group",
                        loading || !email ? "opacity-70 cursor-not-allowed" : "hover:scale-[0.98] active:scale-95"
                      )}
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Kirim Link Reset
                          <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            )}
        </div>
      </div>

      <p className="text-center mt-12 text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tighter">
        &copy; 2024 Sekretariat DPRD - Dikembangkan untuk Akuntabilitas & Transparansi
      </p>
    </motion.div>
  </div>
);
}
