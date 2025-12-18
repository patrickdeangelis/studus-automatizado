/**
 * AppLayout Component
 * Componente base para páginas autenticadas
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import GlobalHeader from './GlobalHeader';
import { Toaster } from '@/components/ui/toast';

export default function AppLayout() {
  return (
    <>
      <GlobalHeader />
      <Outlet />
      <Toaster />
    </>
  );
}