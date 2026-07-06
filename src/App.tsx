import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Discover from './pages/Discover'
import Wallet from './pages/Wallet'
import Vouchers from './pages/Vouchers'
import ActiveSession from './pages/ActiveSession'
import ProviderDashboard from './pages/ProviderDashboard'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/discover" element={
            <ProtectedRoute><Discover /></ProtectedRoute>
          } />
          <Route path="/wallet" element={
            <ProtectedRoute><Wallet /></ProtectedRoute>
          } />
          <Route path="/vouchers" element={
            <ProtectedRoute><Vouchers /></ProtectedRoute>
          } />
          <Route path="/session/:sessionId" element={
            <ProtectedRoute><ActiveSession /></ProtectedRoute>
          } />

          <Route path="/provider" element={
            <ProtectedRoute allowedRoles={['provider']}><ProviderDashboard /></ProtectedRoute>
          } />

          {/* Hidden admin route - never linked anywhere in the UI */}
          <Route path="/gridnet-control-x7q" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
