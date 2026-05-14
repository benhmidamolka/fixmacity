import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import PresidentDashboard from './pages/President/PresidentDashboard'
import PresidentDeclarations from './pages/President/PresidentDeclarations'
import PresidentIncoming from './pages/President/PresidentIncoming'
import PresidentSuivi from './pages/President/PresidentSuivi'
import PresidentPersonnel from './pages/President/PresidentPersonnel'
import PresidentServices from './pages/President/PresidentServices'
import PresidentPropositions from './pages/President/PresidentPropositions'
import PresidentNotifications from './pages/President/PresidentNotifications'
import PresidentSettings from './pages/President/PresidentSettings'
import ChefDeclarationDetail from './pages/Chef/ChefDeclarationDetail'
import ChefDashboard         from './pages/Chef/ChefDashboard'
import ChefDeclarations      from './pages/Chef/ChefDeclarations'
import ChefMap               from './pages/Chef/ChefMap'
import ChefAgents            from './pages/Chef/ChefAgents'
import ChefNotifications     from './pages/Chef/ChefNotifications'
import ChefSettings          from './pages/Chef/ChefSettings'
import AgentDeclarationDetail from './pages/Agent/AgentDeclarationDetail'
import AgentDeclarations from './pages/Agent/AgentDeclarations'
import AgentDashboard from './pages/Agent/AgentDashboard'
import AgentNotifications from './pages/Agent/AgentNotifications'
import AgentSettings from './pages/Agent/AgentSettings'

// Public Pages
import Landing         from './pages/Public/Landing'
import Login           from './pages/Public/Login'
import Register        from './pages/Public/Register'
import ForgotPassword  from './pages/Public/ForgotPassword'
import ResetPassword   from './pages/Public/ResetPassword'

// Citizen Pages
import Dashboard         from './pages/Citizen/Dashboard'
import NouveauSignalement from './pages/Citizen/NouveauSignalement'
import MesSignalements   from './pages/Citizen/MesSignalements'
import MapPage           from './pages/Citizen/MapPage'
import Profile           from './pages/Citizen/Profile'
import Propositions      from './pages/Citizen/Propositions'
import TravauxRealises   from './pages/Citizen/TravauxRealises'

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('fmc_token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

const App: React.FC = () => {
  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/"                element={<Landing />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />

        {/* Citizen Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/nouveau-signalement" element={
          <ProtectedRoute><NouveauSignalement /></ProtectedRoute>
        } />
        <Route path="/mes-signalements" element={
          <ProtectedRoute><MesSignalements /></ProtectedRoute>
        } />
        <Route path="/map" element={
          <ProtectedRoute><MapPage /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />
        <Route path="/propositions" element={
          <ProtectedRoute><Propositions /></ProtectedRoute>
        } />
        <Route path="/travaux-realises" element={
          <ProtectedRoute><TravauxRealises /></ProtectedRoute>
        } />

        {/* President Routes */}
        <Route path="/president" element={<Navigate to="/president/dashboard" replace />} />
        <Route path="/president/dashboard" element={
          <ProtectedRoute><PresidentDashboard /></ProtectedRoute>
        } />
        <Route path="/president/declarations" element={
          <ProtectedRoute><PresidentDeclarations /></ProtectedRoute>
        } />
        <Route path="/president/incoming" element={
          <ProtectedRoute><PresidentIncoming /></ProtectedRoute>
        } />
        <Route path="/president/suivi" element={
          <ProtectedRoute><PresidentSuivi /></ProtectedRoute>
        } />
        <Route path="/president/personnel" element={
          <ProtectedRoute><PresidentPersonnel /></ProtectedRoute>
        } />
        <Route path="/president/services" element={
          <ProtectedRoute><PresidentServices /></ProtectedRoute>
        } />
        <Route path="/president/propositions" element={
          <ProtectedRoute><PresidentPropositions /></ProtectedRoute>
        } />
        <Route path="/president/notifications" element={
          <ProtectedRoute><PresidentNotifications /></ProtectedRoute>
        } />
        <Route path="/president/settings" element={
          <ProtectedRoute><PresidentSettings /></ProtectedRoute>
        } />

        {/* Chef Routes */}
        <Route path="/chef" element={<Navigate to="/chef/dashboard" replace />} />
        <Route path="/chef/dashboard" element={
          <ProtectedRoute><ChefDashboard /></ProtectedRoute>
        } />
        <Route path="/chef/declarations" element={
          <ProtectedRoute><ChefDeclarations /></ProtectedRoute>
        } />
        <Route path="/chef/map" element={
          <ProtectedRoute><ChefMap /></ProtectedRoute>
        } />
        <Route path="/chef/agents" element={
          <ProtectedRoute><ChefAgents /></ProtectedRoute>
        } />
        <Route path="/chef/declarations/:id" element={
          <ProtectedRoute><ChefDeclarationDetail /></ProtectedRoute>
        } />
        <Route path="/chef/notifications" element={
          <ProtectedRoute><ChefNotifications /></ProtectedRoute>
        } />
        <Route path="/chef/settings" element={
          <ProtectedRoute><ChefSettings /></ProtectedRoute>
        } />

        {/* Agent Routes */}
        <Route path="/agent" element={<Navigate to="/agent/dashboard" replace />} />
        <Route path="/agent/dashboard" element={
          <ProtectedRoute><AgentDashboard /></ProtectedRoute>
        } />
        <Route path="/agent/declarations" element={
          <ProtectedRoute><AgentDeclarations /></ProtectedRoute>
        } />
        <Route path="/agent/declarations/:id" element={
          <ProtectedRoute><AgentDeclarationDetail /></ProtectedRoute>
        } />

        <Route path="/agent/notifications" element={
          <ProtectedRoute><AgentNotifications /></ProtectedRoute>
        } />
        <Route path="/agent/settings" element={
          <ProtectedRoute><AgentSettings /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </>
  )
}

export default App
