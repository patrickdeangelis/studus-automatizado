import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import DisciplinesPage from './pages/DisciplinesPage';
import DisciplineDetailsPage from './pages/DisciplineDetailsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/Layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="disciplines" element={<DisciplinesPage />} />
          <Route path="disciplines/:id" element={<DisciplineDetailsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
