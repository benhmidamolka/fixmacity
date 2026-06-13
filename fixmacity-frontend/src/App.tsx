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
import ChefDeclarations      from './pages/Chef/ChefDeclarations'
import ChefDashboard         from './pages/Chef/ChefDashboard'
import ChefMap               from './pages/Chef/ChefMap'
import ChefAgents            from './pages/Chef/ChefAgents'
import ChefNotifications     from './pages/Chef/ChefNotifications'
import ChefSettings          from './pages/Chef/ChefSettings'
import ChefTasks             from './pages/Chef/ChefTasks'
import AgentDeclarations      from './pages/Agent/AgentDeclarations'
import AgentKanbanBoard       from './pages/Agent/AgentKanbanBoard'
import AgentNotifications     from './pages/Agent/AgentNotifications'
import AgentSettings          from './pages/Agent/AgentSettings'
import AgentArchives          from './pages/Agent/AgentArchives'
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
const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles?: string[]
}) => {
  const token = localStorage.getItem('fmc_token')
  if (!token) return <Navigate to="/login" replace />

  if (allowedRoles) {
    const user = JSON.parse(localStorage.getItem('fmc_user') || '{}')
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/login" replace />
    }
  }
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
          <ProtectedRoute allowedRoles={['citizen']}><Dashboard /></ProtectedRoute>
        } />
        <Route path="/nouveau-signalement" element={
          <ProtectedRoute allowedRoles={['citizen']}><NouveauSignalement /></ProtectedRoute>
        } />
        <Route path="/mes-signalements" element={
          <ProtectedRoute allowedRoles={['citizen']}><MesSignalements /></ProtectedRoute>
        } />
        <Route path="/map" element={
          <ProtectedRoute allowedRoles={['citizen']}><MapPage /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute allowedRoles={['citizen']}><Profile /></ProtectedRoute>
        } />
        <Route path="/propositions" element={
          <ProtectedRoute allowedRoles={['citizen']}><Propositions /></ProtectedRoute>
        } />
        <Route path="/travaux-realises" element={
          <ProtectedRoute allowedRoles={['citizen']}><TravauxRealises /></ProtectedRoute>
        } />

        {/* President Routes */}
        <Route path="/president" element={<Navigate to="/president/dashboard" replace />} />
        <Route path="/president/dashboard" element={
          <ProtectedRoute allowedRoles={['president']}><PresidentDashboard /></ProtectedRoute>
        } />
        <Route path="/president/declarations" element={
          <ProtectedRoute allowedRoles={['president']}><PresidentDeclarations /></ProtectedRoute>
        } />
        <Route path="/president/incoming" element={
          <ProtectedRoute allowedRoles={['president']}><PresidentIncoming /></ProtectedRoute>
        } />
        <Route path="/president/suivi" element={
          <ProtectedRoute allowedRoles={['president']}><PresidentSuivi /></ProtectedRoute>
        } />
        <Route path="/president/personnel" element={
          <ProtectedRoute allowedRoles={['president']}><PresidentPersonnel /></ProtectedRoute>
        } />
        <Route path="/president/services" element={
          <ProtectedRoute allowedRoles={['president']}><PresidentServices /></ProtectedRoute>
        } />
        <Route path="/president/propositions" element={
          <ProtectedRoute allowedRoles={['president']}><PresidentPropositions /></ProtectedRoute>
        } />
        <Route path="/president/notifications" element={
          <ProtectedRoute allowedRoles={['president']}><PresidentNotifications /></ProtectedRoute>
        } />
        <Route path="/president/settings" element={
          <ProtectedRoute allowedRoles={['president']}><PresidentSettings /></ProtectedRoute>
        } />

        {/* Chef Routes */}
        <Route path="/chef" element={<Navigate to="/chef/dashboard" replace />} />
        <Route path="/chef/dashboard" element={
          <ProtectedRoute allowedRoles={['chef']}><ChefDashboard /></ProtectedRoute>
        } />
        <Route path="/chef/declarations" element={
          <ProtectedRoute allowedRoles={['chef']}><ChefDeclarations /></ProtectedRoute>
        } />
        <Route path="/chef/tasks" element={
          <ProtectedRoute allowedRoles={['chef']}><ChefTasks /></ProtectedRoute>
        } />
        <Route path="/chef/tasks/:id" element={
          <ProtectedRoute allowedRoles={['chef']}><ChefTasks /></ProtectedRoute>
        } />
        <Route path="/chef/map" element={
          <ProtectedRoute allowedRoles={['chef']}><ChefMap /></ProtectedRoute>
        } />
        <Route path="/chef/agents" element={
          <ProtectedRoute allowedRoles={['chef']}><ChefAgents /></ProtectedRoute>
        } />
        <Route path="/chef/declarations/:id" element={
          <ProtectedRoute allowedRoles={['chef']}><ChefDeclarations /></ProtectedRoute>
        } />
        <Route path="/chef/notifications" element={
          <ProtectedRoute allowedRoles={['chef']}><ChefNotifications /></ProtectedRoute>
        } />
        <Route path="/chef/settings" element={
          <ProtectedRoute allowedRoles={['chef']}><ChefSettings /></ProtectedRoute>
        } />

        {/* Agent Routes */}
        <Route path="/agent" element={<Navigate to="/agent/declarations" replace />} />
        <Route path="/agent/declarations" element={
          <ProtectedRoute allowedRoles={['agent']}><AgentDeclarations /></ProtectedRoute>
        } />
        <Route path="/agent/board" element={
          <ProtectedRoute allowedRoles={['agent']}><AgentKanbanBoard /></ProtectedRoute>
        } />
        <Route path="/agent/notifications" element={
          <ProtectedRoute allowedRoles={['agent']}><AgentNotifications /></ProtectedRoute>
        } />
        <Route path="/agent/settings" element={
          <ProtectedRoute allowedRoles={['agent']}><AgentSettings /></ProtectedRoute>
        } />
        <Route path="/agent/archives" element={
          <ProtectedRoute allowedRoles={['agent']}><AgentArchives /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </>
  )
}

export default App
