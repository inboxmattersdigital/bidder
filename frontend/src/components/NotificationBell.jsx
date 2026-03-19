import { useState } from "react";
import { useNotifications } from "../context/NotificationContext";
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Target, 
  User, 
  ShieldAlert, 
  UserPlus, 
  DollarSign,
  MessageSquare,
  Wifi,
  WifiOff
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";

const getNotificationIcon = (type) => {
  switch (type) {
    case 'campaign_update':
      return <Target className="w-4 h-4 text-[#3B82F6]" />;
    case 'user_activity':
      return <User className="w-4 h-4 text-[#10B981]" />;
    case 'security_alert':
      return <ShieldAlert className="w-4 h-4 text-[#EF4444]" />;
    case 'new_advertiser':
      return <UserPlus className="w-4 h-4 text-[#8B5CF6]" />;
    case 'budget_alert':
      return <DollarSign className="w-4 h-4 text-[#F59E0B]" />;
    case 'system_message':
      return <MessageSquare className="w-4 h-4 text-[#64748B]" />;
    default:
      return <Bell className="w-4 h-4 text-[#64748B]" />;
  }
};

const getNotificationTitle = (notification) => {
  const { type, data } = notification;
  
  switch (type) {
    case 'campaign_update':
      return `Campaign "${data.campaign_name}" ${data.status}`;
    case 'user_activity':
      return `${data.actor_name} ${data.action}`;
    case 'security_alert':
      return `Security: ${data.alert_type}`;
    case 'new_advertiser':
      return `New advertiser: ${data.advertiser_name}`;
    case 'budget_alert':
      return `Budget ${data.alert_type}: ${data.campaign_name}`;
    case 'system_message':
      return data.message;
    case 'connected':
      return 'Connected to notifications';
    default:
      return 'Notification';
  }
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { 
    isConnected, 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useNotifications();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]"
          data-testid="notification-bell"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#EF4444] text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 surface-primary border-panel" 
        align="end"
        data-testid="notification-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#2D3B55]">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#F8FAFC]">Notifications</h3>
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="w-3 h-3 text-[#10B981]" />
              ) : (
                <WifiOff className="w-3 h-3 text-[#EF4444]" />
              )}
              <span className="text-xs text-[#64748B]">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 text-xs text-[#3B82F6] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10"
                title="Mark all as read"
              >
                <CheckCheck className="w-3 h-3" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                className="h-7 text-xs text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                title="Clear all"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[350px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="w-8 h-8 text-[#2D3B55] mx-auto mb-2" />
              <p className="text-sm text-[#64748B]">No notifications yet</p>
              <p className="text-xs text-[#4B5563] mt-1">
                {isConnected ? 'You\'ll see updates here' : 'Connect to receive updates'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#2D3B55]">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    notification.read 
                      ? 'bg-transparent hover:bg-[#0B1221]' 
                      : 'bg-[#3B82F6]/5 hover:bg-[#3B82F6]/10'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0B1221] flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${notification.read ? 'text-[#94A3B8]' : 'text-[#F8FAFC]'}`}>
                        {getNotificationTitle(notification)}
                      </p>
                      {notification.data?.target && (
                        <p className="text-xs text-[#64748B] truncate">{notification.data.target}</p>
                      )}
                      <p className="text-xs text-[#4B5563] mt-1">
                        {formatTime(notification.receivedAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-[#3B82F6] flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t border-[#2D3B55] text-center">
            <span className="text-xs text-[#64748B]">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
