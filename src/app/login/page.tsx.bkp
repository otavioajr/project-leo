'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/supabase/hooks';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mountain } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useSupabase();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const message = 'Email ou senha incorretos. Por favor, tente novamente.';
        setError(message);
        toast({ title: 'Erro de Login', description: message, variant: 'destructive' });
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

  const handleSignUp = async () => {
    if (!email || !password) {
        toast({
            title: 'Campos Vazios',
            description: 'Por favor, preencha o email e a senha para criar uma conta.',
            variant: 'destructive',
        });
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        toast({ title: 'Erro ao Criar Conta', description: error.message, variant: 'destructive' });
      } else {
        toast({
          title: 'Conta Criada com Sucesso!',
          description: `Agora, siga o passo-a-passo para tornar ${data.user?.email} um administrador.`,
        });
      }
      // Don't redirect, let them see the next step instructions
    } catch {
      const message = 'Não foi possível criar a conta.';
      setError(message);
      toast({ title: 'Erro ao Criar Conta', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <Link href="/" className="flex items-center gap-2 justify-center mb-4">
                    <Mountain className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg font-headline">Chaves Adventure</span>
                </Link>
                <CardTitle className="text-2xl font-headline">Painel de Administração</CardTitle>
                <CardDescription>
                    Use suas credenciais para acessar o painel.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="admin@exemplo.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Entrando...' : 'Entrar'}
                    </Button>
                </form>
                 <div className="mt-4 text-center text-sm">
                    Não tem uma conta?{" "}
                    <Button variant="link" className="p-0 h-auto" onClick={handleSignUp} disabled={isLoading}>
                        Crie uma agora
                    </Button>
                </div>
            </CardContent>
        </Card>
        <Card className="w-full max-w-sm mt-6">
             <CardHeader>
                <CardTitle className="text-lg font-headline">Como se tornar um Administrador</CardTitle>
             </CardHeader>
             <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Preencha o email e senha acima e clique em <strong>{'"Crie uma agora"'}</strong>.</p>
                <p>2. Abra o painel do <strong>Supabase</strong> do seu projeto.</p>
                <p>3. Vá para <strong>Authentication {'>'} Users</strong> e encontre o usuário que você criou.</p>
                <p>4. No <strong>SQL Editor</strong>, execute: <code>{"UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{\"is_admin\": true}' WHERE email = 'SEU_EMAIL';"}</code></p>
                <p>5. Volte para esta página e faça login com as credenciais que você criou.</p>
             </CardContent>
        </Card>
    </div>
  );
}
