'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/supabase/hooks';
import { useToast } from "@/hooks/use-toast";
import { Mountain, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useSupabase();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const message = 'Email ou senha incorretos. Por favor, tente novamente.';
        setError(message);
        toast({ title: 'Erro de Login', description: message, variant: 'destructive' });
      } else if (data.user?.app_metadata?.must_change_password) {
        router.push('/alterar-senha');
      } else {
        toast({ title: 'Login bem-sucedido!' });
        router.push('/admin');
      }
    } catch {
      const message = 'Credenciais inválidas ou erro desconhecido.';
      setError(message);
      toast({ title: 'Erro de Login', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh">
      {/* Left panel - immersive visual */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background with layered gradients */}
        <div className="absolute inset-0 bg-[#0f2b1a]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 30% 20%, rgba(20, 80, 50, 0.6) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 80%, rgba(15, 55, 35, 0.8) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(25, 90, 55, 0.3) 0%, transparent 70%)
            `,
          }}
        />

        {/* Topographic pattern overlay */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%) 0 0 / 60px 60px,
              repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 30px),
              repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 30px)
            `,
          }}
        />

        {/* Floating decorative elements */}
        <div className="absolute top-[15%] left-[10%] w-32 h-32 rounded-full border border-white/[0.06] animate-[float_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-[20%] right-[15%] w-48 h-48 rounded-full border border-white/[0.04] animate-[float_25s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-[60%] left-[30%] w-20 h-20 rounded-full bg-white/[0.02] animate-[float_18s_ease-in-out_infinite_2s]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-white/15 transition-all duration-300">
              <Mountain className="h-5 w-5 text-white/90" />
            </div>
            <div className="flex flex-col">
              <span className="font-adventure text-xl text-white/90 tracking-wide leading-none">chaves</span>
              <span className="text-[10px] text-white/40 tracking-[0.3em] uppercase font-headline">adventure</span>
            </div>
          </Link>

          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-[2px] bg-gradient-to-r from-emerald-400/80 to-transparent rounded-full" />
              <span className="text-emerald-400/70 text-xs font-headline tracking-[0.2em] uppercase">Painel Administrativo</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-headline font-bold text-white leading-[1.1] mb-5">
              Gerencie suas
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-green-300">
                aventuras
              </span>
            </h1>
            <p className="text-white/40 text-base leading-relaxed font-body max-w-sm">
              Acesse o painel para gerenciar atividades, inscrições e conteúdo do site.
            </p>
          </div>

          <div className="flex items-center gap-4 text-white/20 text-xs font-body">
            <span>&copy; 2026 Chaves Adventure</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <Link href="/" className="hover:text-white/40 transition-colors">
              Voltar ao site
            </Link>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#fafaf8] relative">
        {/* Subtle texture */}
        <div className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Mobile logo */}
        <Link href="/" className="lg:hidden flex items-center gap-3 mb-12 group">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
            <Mountain className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-adventure text-xl text-foreground tracking-wide leading-none">chaves</span>
            <span className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase font-headline">adventure</span>
          </div>
        </Link>

        <div className="w-full max-w-[380px] relative z-10">
          {/* Header */}
          <div className="mb-10">
            <h2 className="text-2xl font-headline font-bold text-foreground mb-2">
              Bem-vindo de volta
            </h2>
            <p className="text-muted-foreground text-sm font-body">
              Entre com suas credenciais para acessar o painel.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className={`text-xs font-headline font-semibold uppercase tracking-wider transition-colors duration-200 ${
                  focusedField === 'email' ? 'text-primary' : 'text-muted-foreground/70'
                }`}
              >
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full h-12 px-4 bg-white rounded-xl border-2 border-transparent ring-1 ring-black/[0.08] text-foreground text-sm font-body placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className={`text-xs font-headline font-semibold uppercase tracking-wider transition-colors duration-200 ${
                  focusedField === 'password' ? 'text-primary' : 'text-muted-foreground/70'
                }`}
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
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
                  Entrar no Painel
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <div className="mt-8 pt-6 border-t border-black/[0.06] text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-primary font-body transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowRight className="w-3 h-3 rotate-180" />
              Voltar ao site principal
            </Link>
          </div>
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
