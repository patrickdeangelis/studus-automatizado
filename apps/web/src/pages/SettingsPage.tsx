import React, { useState, useEffect } from 'react';

export default function SettingsPage() {
    const [enabled, setEnabled] = useState(false);
    const [interval, setIntervalVal] = useState('24');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                setEnabled(data.auto_sync_enabled === 'true');
                setIntervalVal(data.auto_sync_interval || '24');
            });
    }, []);

    const handleSave = async (key: string, value: any) => {
        setSaving(true);
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
        });
        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie o comportamento do robô de automação.</p>
                </div>

                <div className="space-y-6">
                    {/* Auto Sync Section */}
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Sincronismo Automático</h3>
                                <p className="text-sm text-gray-500">O robô buscará atualizações no Studus periodicamente.</p>
                            </div>
                            <div className="flex items-center">
                                <button
                                    onClick={() => {
                                        const newVal = !enabled;
                                        setEnabled(newVal);
                                        handleSave('auto_sync_enabled', newVal);
                                    }}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        {enabled && (
                            <div className="pt-6 border-t border-gray-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Frequência de Sincronização</label>
                                <select
                                    value={interval}
                                    onChange={(e) => {
                                        setIntervalVal(e.target.value);
                                        handleSave('auto_sync_interval', e.target.value);
                                    }}
                                    className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm border"
                                >
                                    <option value="1">A cada 1 hora</option>
                                    <option value="4">A cada 4 horas</option>
                                    <option value="12">A cada 12 horas</option>
                                    <option value="24">Uma vez por dia (Recomendado)</option>
                                    <option value="168">Uma vez por semana</option>
                                </select>
                                <p className="mt-2 text-xs text-amber-600">⚠️ Nota: Sincronismos frequentes aumentam o risco de bloqueio da conta no Studus.</p>
                            </div>
                        )}
                    </div>

                    {/* App Info */}
                    <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-400 italic">
                            Status do Servidor: {saving ? 'Salvando...' : 'Conectado'}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
