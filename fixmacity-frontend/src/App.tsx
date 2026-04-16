import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import DashboardLayout from './components/layout/DashboardLayout';
import CitizenDashboard from './pages/citizen/Dashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Dashboard routes (authenticated) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<CitizenDashboard />} />
          {/* TODO: Add additional dashboard subroutes */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
