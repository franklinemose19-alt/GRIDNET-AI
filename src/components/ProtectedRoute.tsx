import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Role = 'user' | 'provider' | 'admin'

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles?: Role[]
}) {
  const { user, profile, loading } = useAuth()

  if (loading) return <div className="center-screen">Loading...</div>
  if (!user || !profile) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/discover" replace />
  }
  return <>{children}</>
}
