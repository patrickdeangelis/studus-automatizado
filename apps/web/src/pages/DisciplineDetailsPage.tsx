import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

interface Grade {
  studentName: string;
  studentId: string;
  n1: string;
  n2: string;
  n3: string;
  faults: string;
  average: string;
  situation: string;
}

interface Lesson {
    id: string;
    date: string;
    content: string;
    presentCount: number;
    totalStudents: number;
    attendances: { studentName: string; present: boolean }[];
}

interface DisciplineData {
  discipline: {
      name: string;
      class: string;
      lastSyncAt: string;
  };
  grades: Grade[];
}

export default function DisciplineDetailsPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'grades' | 'lessons'>('grades');
  const [data, setData] = useState<DisciplineData | null>(null);
  const [lessonsData, setLessonsData] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  const fetchData = () => {
    fetch(`/api/disciplines/${id}/grades`)
      .then(res => res.json())
      .then(d => {
          setData(d);
          setLoading(false);
      })
      .catch(err => {
          console.error(err);
          setLoading(false);
      });
  };

  const fetchLessons = () => {
    fetch(`/api/disciplines/${id}/lessons`)
      .then(res => res.json())
      .then(d => setLessonsData(d.lessons || []));
  };

  useEffect(() => {
    fetchData();
    if (activeTab === 'lessons') fetchLessons();
    
    const interval = setInterval(async () => {
        try {
            const res = await fetch('/api/tasks');
            const tasks = await res.json();
            const running = tasks.some((t: any) => t.type === 'SYNC_DISCIPLINES' && (t.status === 'RUNNING' || t.status === 'PENDING'));
            
            if (!running && isSyncing) {
                // Sync just finished
                fetchData();
                if (activeTab === 'lessons') fetchLessons();
            }
            setIsSyncing(running);
        } catch (e) {}
    }, 3000);
    
    return () => clearInterval(interval);
  }, [id, isSyncing, activeTab]);

  const toggleLesson = (lessonId: string) => {
      setExpandedLesson(expandedLesson === lessonId ? null : lessonId);
  };

  if (loading) return <div className="p-8 text-center">Carregando dados da turma...</div>;
  if (!data || !data.discipline) return <div className="p-8 text-center text-red-500">Turma não encontrada.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
                <Link to="/disciplines" className="text-gray-500 hover:text-gray-700 bg-white p-2 rounded-full shadow-sm transition-colors">←</Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{data.discipline.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">{data.discipline.class}</span>
                        {data.discipline.lastSyncAt && (
                            <span className="text-xs text-gray-500">
                                Última atualização: {new Date(data.discipline.lastSyncAt).toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            
            <div>
                {isSyncing ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
                        ⏳ Sincronizando Sistema...
                    </span>
                ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Dados Atualizados
                    </span>
                )}
            </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 rounded-xl bg-gray-200 p-1 mb-6 w-fit">
            <button
                onClick={() => setActiveTab('grades')}
                className={`w-32 rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                    activeTab === 'grades' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:bg-white/[0.12] hover:text-gray-700'
                }`}
            >
                Notas
            </button>
            <button
                onClick={() => setActiveTab('lessons')}
                className={`w-32 rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                    activeTab === 'lessons' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:bg-white/[0.12] hover:text-gray-700'
                }`}
            >
                Aulas
            </button>
        </div>

        {activeTab === 'grades' ? (
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matrícula</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">N1</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">N2</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">N3</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Faltas</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Média</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Situação</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.grades.length === 0 ? (
                            <tr><td colSpan={8} className="p-12 text-center text-gray-500 font-medium">Nenhuma nota sincronizada ainda.</td></tr>
                        ) : (
                            data.grades.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.studentId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.studentName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{row.n1 || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{row.n2 || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{row.n3 || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{row.faults || '0'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900">{row.average || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${row.situation === 'APROVADO' ? 'bg-green-100 text-green-800' : 
                                            row.situation === 'REPROVADO' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {row.situation || 'Pendente'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="space-y-4">
                {lessonsData.length === 0 ? (
                    <div className="bg-white p-12 text-center text-gray-500 rounded-lg shadow">Nenhuma aula registrada ou sincronizada.</div>
                ) : (
                    lessonsData.map(lesson => (
                        <div key={lesson.id} className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                            <div 
                                onClick={() => toggleLesson(lesson.id)}
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900">{lesson.date}</span>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                            Presença: {lesson.presentCount}/{lesson.totalStudents}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{lesson.content}</p>
                                </div>
                                <span className="text-gray-400">{expandedLesson === lesson.id ? '▲' : '▼'}</span>
                            </div>
                            
                            {expandedLesson === lesson.id && (
                                <div className="bg-gray-50 p-4 border-t border-gray-200">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Lista de Presença</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {lesson.attendances.map((att, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm">
                                                <span className={att.present ? 'text-green-500' : 'text-red-500'}>
                                                    {att.present ? '✅' : '❌'}
                                                </span>
                                                <span className={att.present ? 'text-gray-900' : 'text-gray-500'}>{att.studentName || 'Aluno desconhecido'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        )}
      </div>
    </div>
  );
}
