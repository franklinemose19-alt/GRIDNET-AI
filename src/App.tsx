import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import './index.css'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Pricing from './pages/Pricing'
import Discover from './pages/Discover'
import Wallet from './pages/Wallet'
import Vouchers from './pages/Vouchers'
import ActiveSession from './pages/ActiveSession'
import ProviderDashboard from './pages/ProviderDashboard'
import AdminDashboard from './pages/AdminDashboard'
import HotspotDetail from './pages/HotspotDetail'
import Notifications from './pages/Notifications'
import Invite from './pages/Invite'
import Advertise from './pages/Advertise'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Legal from './pages/Legal'
  export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Pricing />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
         <Route path="/legal" element={<Legal />} />
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
          <Route path="/hotspot/:id" element={
            <ProtectedRoute><HotspotDetail /></ProtectedRoute>
          } />
          <Route path="/provider" element={
            <ProtectedRoute><ProviderDashboard /></ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute><Notifications /></ProtectedRoute>
          } />
          <Route path="/invite" element={
            <ProtectedRoute><Invite /></ProtectedRoute>
          } />
           <Route path="/advertise" element={
            <ProtectedRoute><Advertise /></ProtectedRoute>
          } />
          <Route path="/gridnet-control-x7q" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
