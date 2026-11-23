'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginPatient, registerPatient } from "../_actions/auth";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/toast-provider";

function formatPhone(value: string) {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 10) {
        return numbers
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
}

function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): string | null {
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
    if (!/[A-Za-z]/.test(password)) return 'A senha deve conter pelo menos uma letra.';
    if (!/[0-9]/.test(password)) return 'A senha deve conter pelo menos um número.';
    return null;
}

export default function PatientLoginPage() {
    const router = useRouter();
    const { addToast } = useToast();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
    const [errors, setErrors] = useState<{ email?: string; password?: string; phone?: string }>({});

    function set(field: string, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    function handlePhoneChange(value: string) {
        set('phone', formatPhone(value));
    }

    function validate() {
        const newErrors: typeof errors = {};
        if (!validateEmail(form.email)) {
            newErrors.email = 'Informe um e-mail válido.';
        }
        const pwdError = validatePassword(form.password);
        if (pwdError) {
            newErrors.password = pwdError;
        }
        if (mode === 'register' && form.phone && form.phone.replace(/\D/g, '').length < 10) {
            newErrors.phone = 'Informe um telefone válido com DDD.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            if (mode === 'register') {
                const res = await registerPatient(form);
                if (res?.error) { addToast(res.error, 'error'); return; }
                addToast('Conta criada com sucesso!', 'success');
            } else {
                const res = await loginPatient({ email: form.email, password: form.password });
                if (res?.error) { addToast(res.error, 'error'); return; }
                addToast('Bem-vindo de volta!', 'success');
            }
            router.push('/paciente/consultas');
        } catch {
            addToast('Erro inesperado. Tente novamente.', 'error');
        } finally {
            setLoading(false);
        }
    }

    function switchMode(newMode: 'login' | 'register') {
        setMode(newMode);
        setErrors({});
        setForm({ name: '', email: '', phone: '', password: '' });
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-xl font-bold text-gray-900">
                        {mode === 'login' ? 'Entrar na sua conta' : 'Criar conta de paciente'}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {mode === 'login' ? 'Acompanhe suas consultas agendadas' : 'Cadastre-se para acompanhar seus agendamentos'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                        <>
                            <div className="space-y-1">
                                <Label>Nome completo</Label>
                                <Input
                                    placeholder="Seu nome"
                                    value={form.name}
                                    onChange={(e) => set('name', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Telefone</Label>
                                <Input
                                    placeholder="(11) 99999-9999"
                                    value={form.phone}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    inputMode="numeric"
                                />
                                {errors.phone && (
                                    <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                                )}
                            </div>
                        </>
                    )}
                    <div className="space-y-1">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            placeholder="seu@email.com"
                            value={form.email}
                            onChange={(e) => set('email', e.target.value)}
                            required
                            className={errors.email ? 'border-red-400 focus-visible:ring-red-300' : ''}
                        />
                        {errors.email && (
                            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                        )}
                    </div>
                    <div className="space-y-1 pb-0">
                        <Label>Senha</Label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => set('password', e.target.value)}
                            required
                            className={errors.password ? 'border-red-400 focus-visible:ring-red-300' : ''}
                        />
                        {errors.password && (
                            <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                        )}
                        {mode === 'register' && !errors.password && (
                            <p className="text-xs text-gray-400 mt-1">Mínimo 6 caracteres, com letras e números.</p>
                        )}
                    </div>

                    {mode === 'login' && (
                        <div className="text-right">
                            <Link href="/paciente/redefinir-senha" className="text-xs text-blue-600 hover:underline">
                                Esqueci minha senha
                            </Link>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl h-11"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? 'Entrar' : 'Criar conta'}
                    </Button>
                </form>

                <a href="/api/paciente/google" className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
                </a>

                <p className="text-center text-sm text-gray-500">
                    {mode === 'login' ? (
                        <>Não tem conta?{' '}
                            <button onClick={() => switchMode('register')} className="text-blue-600 font-semibold hover:underline">Criar conta</button>
                        </>
                    ) : (
                        <>Já tem conta?{' '}
                            <button onClick={() => switchMode('login')} className="text-blue-600 font-semibold hover:underline">Entrar</button>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}
