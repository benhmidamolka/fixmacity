// src/utils/interceptors.ts

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const originalFetch = window.fetch;

window.fetch = async (...args) => {
  let [resource, config] = args;
  
  // 1. Execute the original request
  let response = await originalFetch(resource, config);

  // 2. If 401 and not already a login/refresh request
  const url = resource.toString();
  if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
    const refreshToken = localStorage.getItem('fmc_refresh_token');
    
    if (refreshToken) {
      try {
        // Attempt to refresh
        const refreshRes = await originalFetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          // Save new tokens
          localStorage.setItem('fmc_token', data.token);
          if (data.refreshToken) {
            localStorage.setItem('fmc_refresh_token', data.refreshToken);
          }
          
          // 3. Retry the original request with the new token
          if (config && config.headers) {
            const headers = new Headers(config.headers);
            headers.set('Authorization', `Bearer ${data.token}`);
            config.headers = headers;
          }
          
          return originalFetch(resource, config);
        } else {
          // Refresh failed, clear storage and redirect
          localStorage.removeItem('fmc_token');
          localStorage.removeItem('fmc_refresh_token');
          localStorage.removeItem('fmc_user');
          if (!url.includes('/auth/me')) {
             window.location.href = '/login';
          }
        }
      } catch (err) {
        console.error('Refresh token error:', err);
      }
    }
  }

  return response;
};

export {};
