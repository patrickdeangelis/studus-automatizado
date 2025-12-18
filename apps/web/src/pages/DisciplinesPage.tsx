import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Discipline {
  id: string;
  name: string;
  code: string;
  class: string;
  lastSyncAt: string;
}

export default function DisciplinesPage() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/disciplines')
      .then(res => res.json())
      .then(data => {
          setDisciplines(data.disciplines || []);
          setLoading(false);
      })
      .catch(err => {
          console.error(err);
          setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Minhas Turmas</h1>

        {loading ? (
            <p>Carregando...</p>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disciplines && disciplines.length > 0 ? disciplines.map(disc => (
                <Link key={disc.id} to={`/disciplines/${disc.id}`} className="block">
                    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {disc.class}
                            </span>
                            <span className="text-xs text-gray-500">{disc.id}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{disc.name}</h3>
                        <p className="text-sm text-gray-500">{disc.code}</p>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-xs text-gray-400">
                                Atualizado em: {disc.lastSyncAt ? new Date(disc.lastSyncAt).toLocaleDateString() : 'Nunca'}
                            </span>
                            <span className="text-blue-600 text-sm font-medium">Ver Notas →</span>
                        </div>
                    </div>
                </Link>
            )) : (
                <p className="text-gray-500 col-span-3">Nenhuma turma encontrada. Sincronize no Dashboard.</p>
            )}
            </div>
        )}
      </main>
    </div>
  );
}
