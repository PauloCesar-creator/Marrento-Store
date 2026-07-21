import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, AlertTriangle, Package, Sparkles } from 'lucide-react';
import { Notification } from '../types';

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onTriggerReplenish: (productId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onTriggerReplenish,
  isOpen,
  onClose,
}: NotificationPanelProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close panel */}
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
              onClick={onClose}
              id="notif-backdrop"
            />

            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute right-0 mt-3 w-80 sm:w-96 rounded-xl border border-brand-tertiary bg-brand-secondary p-4 shadow-2xl z-50 overflow-hidden"
              id="notif-panel-container"
            >
              <div className="flex items-center justify-between border-b border-brand-tertiary pb-3 mb-3" id="notif-header">
                <div className="flex items-center gap-2" id="notif-title-group">
                  <Bell className="w-4 h-4 text-brand-primary" id="notif-icon-bell" />
                  <h3 className="font-sans font-semibold text-sm text-brand-neutral" id="notif-title">
                    Notificações
                  </h3>
                  {unreadCount > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-red text-white"
                      id="notif-badge-count"
                    >
                      {unreadCount} novas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="text-xs text-brand-primary hover:underline transition"
                    id="notif-btn-mark-all"
                  >
                    Ler todas
                  </button>
                )}
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1" id="notif-list">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500" id="notif-empty-state">
                    <Sparkles className="w-8 h-8 text-brand-tertiary mb-2" id="notif-empty-sparkle" />
                    <p className="text-xs" id="notif-empty-text">Nenhuma notificação por enquanto</p>
                    <p className="text-[10px] mt-0.5">O sistema avisará se houver itens abaixo do estoque mínimo.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`relative flex gap-3 p-3 rounded-lg border transition ${
                        notif.read
                          ? 'bg-brand-bg/40 border-brand-tertiary/50 opacity-75'
                          : 'bg-brand-tertiary/40 border-brand-primary/20'
                      }`}
                      id={`notif-item-${notif.id}`}
                    >
                      <div className="mt-0.5" id={`notif-type-icon-${notif.id}`}>
                        {notif.type === 'low_stock' ? (
                          <div className="p-1 rounded bg-brand-red/10 text-brand-red" id={`notif-badge-red-${notif.id}`}>
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1 rounded bg-brand-green/10 text-brand-green" id={`notif-badge-green-${notif.id}`}>
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0" id={`notif-content-group-${notif.id}`}>
                        <p className="text-xs font-medium text-brand-neutral leading-relaxed" id={`notif-msg-${notif.id}`}>
                          {notif.message}
                        </p>
                        <p className="text-[9px] text-gray-500 mt-1 font-mono" id={`notif-time-${notif.id}`}>
                          SKU: {notif.sku} • {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>

                        {!notif.read && notif.type === 'low_stock' && (
                          <button
                            onClick={() => {
                              onTriggerReplenish(notif.productId);
                              onMarkAsRead(notif.id);
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold bg-brand-primary text-black hover:bg-brand-primary/85 transition"
                            id={`notif-replenish-btn-${notif.id}`}
                          >
                            <Package className="w-3 h-3" />
                            Repor Estoque
                          </button>
                        )}
                      </div>

                      {!notif.read && (
                        <button
                          onClick={() => onMarkAsRead(notif.id)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-brand-primary transition"
                          title="Marcar como lida"
                          id={`notif-read-btn-${notif.id}`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
