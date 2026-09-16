import React, { useEffect, useState } from "react";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
} from "../utils/api";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const response = await getNotifications();
      if (!response.ok) return;
      const data = await response.json();
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      // Notifications are auxiliary and should not block the app shell.
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const markAllRead = async () => {
    await markAllNotificationsRead();
    await load();
  };

  const markRead = async (id) => {
    await markNotificationRead(id);
    await load();
  };

  const remove = async (id) => {
    await deleteNotification(id);
    await load();
  };

  const enablePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted" || !import.meta.env.VITE_VAPID_PUBLIC_KEY)
      return;
    const registration = await navigator.serviceWorker.register("/sw.js");
    const key = import.meta.env.VITE_VAPID_PUBLIC_KEY.replace(
      /-/g,
      "+",
    ).replace(/_/g, "/");
    const padding = "=".repeat((4 - (key.length % 4)) % 4);
    const applicationServerKey = Uint8Array.from(
      atob(key + padding),
      (character) => character.charCodeAt(0),
    );
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    await savePushSubscription(subscription.toJSON());
  };

  return (
    <div className="notification-bell-wrap">
      <button
        type="button"
        className="notification-bell"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        🔔
        {unread > 0 && (
          <span className="notification-count">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="notification-panel">
          <div className="notification-panel-top">
            <strong>Notifications</strong>
            <span>
              {unread > 0 && (
                <button type="button" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
              <button type="button" onClick={enablePush}>
                Enable push
              </button>
            </span>
          </div>
          {items.length === 0 ? (
            <div className="notification-empty">You are all caught up.</div>
          ) : (
            items.map((item) => (
              <div
                className={`notification-item ${item.read_at ? "read" : ""}`}
                key={item.id}
              >
                <button
                  type="button"
                  className="notification-content"
                  onClick={() => markRead(item.id)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </button>
                <button
                  type="button"
                  className="notification-delete"
                  aria-label="Delete notification"
                  onClick={() => remove(item.id)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
