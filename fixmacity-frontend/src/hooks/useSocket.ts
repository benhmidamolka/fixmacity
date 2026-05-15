import { useEffect } from 'react';
import { io } from 'socket.io-client';

const SERVER = (import.meta.env.VITE_API_URL || 'http://localhost:5005/api')
  .replace('/api', '');

export function useSocket(onNotification: (data: unknown) => void) {
  useEffect(() => {
    const token = localStorage.getItem('fmc_token');
    const user = JSON.parse(localStorage.getItem('fmc_user') || '{}');

    if (!token || !user.id) return;

    const socket = io(SERVER, {
      auth: { token },
    });

    socket.emit('join', user.id);
    socket.on('notification', onNotification);

    return () => {
      socket.disconnect();
    };
  }, [onNotification]);
}
