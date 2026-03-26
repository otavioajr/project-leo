'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase, useUser } from '@/supabase/hooks';
import { useToast } from '@/hooks/use-toast';
import { Mountain, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useSupabase();
  const { user, loading } = useUser();
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#fafaf8]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const mustChange = user.app_metadata?.must_change_password === true;
  if (!mustChange) {
    router.replace('/admin');
    return null;
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      const { error: rpcError } = await supabase.rpc('clear_must_change_password');
      if (rpcError) {
        setError('Senha alterada, mas houve um erro ao finalizar. Tente fazer login novamente.');
        return;
      }

      // Refresh the session to get updated app_metadata
      await supabase.auth.refreshSession();

      toast({ title: 'Senha alterada com sucesso!' });
      router.push('/admin');
    } catch {
      setError('Erro ao alterar a senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 bg-[#1a2e1a]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 30% 20%, rgba(34, 85, 34, 0.6) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 80%, rgba(22, 60, 22, 0.8) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(40, 100, 40, 0.3) 0%, transparent 70%)
            `,
          }}
        />
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%) 0 0 / 60px 60px,
              repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 30px),
              repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 30px)
            `,
          }}
        />

        <div className="absolute top-[15%] left-[10%] w-32 h-32 rounded-full border border-white/[0.06] animate-[float_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-[20%] right-[15%] w-48 h-48 rounded-full border border-white/[0.04] animate-[float_25s_ease-in-out_infinite_reverse]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Mountain className="h-5 w-5 text-white/90" />
            </div>
            <div className="flex flex-col">
              <span className="font-adventure text-xl text-white/90 tracking-wide leading-none">chaves</span>
              <span className="text-[10px] text-white/40 tracking-[0.3em] uppercase font-headline">adventure</span>
            </div>
          </div>

          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-[2px] bg-gradient-to-r from-emerald-400/80 to-transparent rounded-full" />
              <span className="text-emerald-400/70 text-xs font-headline tracking-[0.2em] uppercase">Primeiro Acesso</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-headline font-bold text-white leading-[1.1] mb-5">
              Defina sua
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-green-400">
                nova senha
              </span>
            </h1>
            <p className="text-white/40 text-base leading-relaxed font-body max-w-sm">
              Por seguranca, crie uma senha pessoal para acessar o painel administrativo.
            </p>
          </div>

          <div className="text-white/20 text-xs font-body">
            <span>&copy; 2026 Chaves Adventure</span>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#fafaf8] relative">
        <div className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
            <Mountain className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-adventure text-xl text-foreground tracking-wide leading-none">chaves</span>
            <span className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase font-headline">adventure</span>
          </div>
        </div>

        <div className="w-full max-w-[380px] relative z-10">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-headline font-bold text-foreground">
                Alterar Senha
              </h2>
            </div>
            <p className="text-muted-foreground text-sm font-body">
              Este e seu primeiro acesso. Por favor, defina uma nova senha para continuar.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="new-password"
                className={`text-xs font-headline font-semibold uppercase tracking-wider transition-colors duration-200 ${
                  focusedField === 'password' ? 'text-primary' : 'text-muted-foreground/70'
                }`}
              >
                Nova Senha
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Minimo 6 caracteres"
                  className="w-full h-12 px-4 pr-12 bg-white rounded-xl border-2 border-transparent ring-1 ring-black/[0.08] text-foreground text-sm font-body placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className={`text-xs font-headline font-semibold uppercase tracking-wider transition-colors duration-200 ${
                  focusedField === 'confirm' ? 'text-primary' : 'text-muted-foreground/70'
                }`}
              >
                Confirmar Senha
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Repita a nova senha"
                  className="w-full h-12 px-4 pr-12 bg-white rounded-xl border-2 border-transparent ring-1 ring-black/[0.08] text-foreground text-sm font-body placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/10">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                <p className="text-sm text-destructive/90 font-body">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-xl text-sm font-headline font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Salvar Nova Senha
                  <ShieldCheck className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(2deg); }
          66% { transform: translateY(10px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}
