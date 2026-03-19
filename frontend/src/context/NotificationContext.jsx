import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { token, isAuthenticated, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  const addNotification = useCallback((notification) => {
    const newNotif = {
      ...notification,
      id: Date.now(),
      read: false,
      receivedAt: new Date().toISOString()
    };
    
    setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount(prev => prev + 1);
    
    // Show toast based on notification type
    const { type, data } = notification;
    
    switch (type) {
      case 'campaign_update':
        toast.info(`Campaign "${data.campaign_name}" is now ${data.status}`, {
          description: new Date(data.timestamp).toLocaleTimeString()
        });
        break;
      case 'user_activity':
        if (user?.role === 'super_admin' || user?.role === 'admin') {
          toast(`${data.actor_name} ${data.action}`, {
            description: data.target || new Date(data.timestamp).toLocaleTimeString()
          });
        }
        break;
      case 'security_alert':
        toast.error(`Security Alert: ${data.alert_type}`, {
          description: data.details?.message || 'Please check the admin panel'
        });
        break;
      case 'new_advertiser':
        toast.success(`New advertiser: ${data.advertiser_name}`, {
          description: data.advertiser_email
        });
        break;
      case 'budget_alert':
        if (data.alert_type === 'depleted') {
          toast.error(`Budget depleted: ${data.campaign_name}`, {
            description: 'Campaign has stopped running'
          });
        } else {
          toast.warning(`Budget warning: ${data.campaign_name}`, {
            description: `${data.percentage}% of budget used`
          });
        }
        break;
      case 'system_message':
        toast(data.message, {
          description: `From: ${data.from}`
        });
        break;
      case 'connected':
        // Don't show toast for connection
        break;
      default:
        break;
    }
  }, [user]);

  const connect = useCallback(() => {
    if (!token || !WS_URL) return;
    
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    try {
      const ws = new WebSocket(`${WS_URL}/api/ws/notifications?token=${token}`);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
        
        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
      };
      
      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        
        try {
          const notification = JSON.parse(event.data);
          addNotification(notification);
        } catch (e) {
          console.error('Failed to parse notification:', e);
        }
      };
      
      ws.onclose = (event) => {
        setIsConnected(false);
        console.log('WebSocket disconnected:', event.code);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        // Attempt to reconnect after 5 seconds if not a manual close
        if (event.code !== 1000 && isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, 5000);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [token, isAuthenticated, addNotification]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [isAuthenticated, token, connect, disconnect]);

  const value = {
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    connect,
    disconnect
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
