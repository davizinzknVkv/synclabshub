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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ x: 380, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 380, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="glass-strong border-surface-border p-4 shadow-elevated rounded-2xl relative overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow-violet animate-pulse shrink-0" />
              <p className="text-[11px] font-black uppercase tracking-widest text-white leading-tight">{n.message}</p>
            </div>
            <div className="mt-3 h-1 rounded-full overflow-hidden bg-surface/50 border border-surface-border/20">
              <div
                className="h-full rounded-full bg-gradient-primary"
                style={{
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
