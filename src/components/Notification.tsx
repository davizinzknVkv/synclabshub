import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface NotificationItem {
  id: number;
  message: string;
}

let notifyFn: ((msg: string) => void) | null = null;

export function notify(msg: string) {
  notifyFn?.(msg);
}

export function NotificationContainer() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev.slice(-4), { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    notifyFn = addNotification;
    return () => { notifyFn = null; };
  }, [addNotification]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-80">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card border border-border rounded-lg p-3 shadow-lg"
          >
            <p className="text-sm font-medium text-card-foreground">{n.message}</p>
            <div className="mt-2 h-1 rounded-full overflow-hidden bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, var(--primary), oklch(0.65 0.25 15))",
                  animation: "progress-shrink 5s linear forwards",
                }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
