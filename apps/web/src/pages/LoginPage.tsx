import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/services';

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, loading } = useAuth();
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await login(credentials.username, credentials.password);

    if (result.success) {
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo ao Studus Automatizado!',
      });
      navigate('/');
    } else {
      setError(result.message || 'Usuário ou senha inválidos');
      toast({
        title: 'Erro de login',
        description: result.message || 'Usuário ou senha inválidos',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">🎓 Studus Automatizado</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sistema de automação para o portal Studus
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Acessar Sistema</CardTitle>
            <CardDescription>
              Digite suas credenciais para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  required
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  placeholder="Digite seu usuário"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="Digite sua senha"
                  disabled={loading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Informações de Acesso</span>
                </div>
              </div>

              <div className="mt-6 text-sm text-gray-600 bg-blue-50 p-4 rounded-md">
                <p className="font-medium mb-2">Acesso Padrão:</p>
                <p>Usuário: <code className="bg-gray-100 px-1 rounded">admin</code></p>
                <p>Senha: <code className="bg-gray-100 px-1 rounded">admin123</code></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}