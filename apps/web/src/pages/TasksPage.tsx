import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Task {
  id: number;
  type: string;
  status: string;
  payload: any;
  result: any;
  created_at: string; // Correct property name from endpoint
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => setTasks(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-6">Histórico de Tarefas</h1>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {tasks.map(task => (
              <li key={task.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-600 truncate">
                      {task.type} <span className="text-gray-500 text-xs">#{task.id}</span>
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ''}
                        ${task.status === 'RUNNING' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${task.status === 'FAILED' ? 'bg-red-100 text-red-800' : ''}
                        ${task.status === 'PENDING' ? 'bg-gray-100 text-gray-800' : ''}
                      `}>
                        {task.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {task.result ? JSON.stringify(task.result).substring(0, 50) + '...' : 'Sem resultado'}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
