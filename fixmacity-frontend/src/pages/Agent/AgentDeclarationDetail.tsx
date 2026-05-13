// src/pages/Agent/AgentDeclarationDetail.tsx
import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

/**
 * This page is now integrated into AgentDashboard.
 * We redirect to the dashboard which will open the detail slide-in.
 */
const AgentDeclarationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to dashboard, but ideally we'd pass a state to open the specific ID
    // For now, simple redirect to dashboard.
    navigate('/agent/dashboard', { state: { openMissionId: id } })
  }, [id, navigate])

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-bold">Chargement de la mission...</p>
      </div>
    </div>
  )
}

export default AgentDeclarationDetail
