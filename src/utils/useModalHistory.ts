import { useEffect, useRef } from 'react';

/**
 * Synchronizes modal open state with the native browser history stack.
 * Allows Android hardware back button, iOS swipe-back, and desktop Back button
 * to close the modal naturally instead of exiting the page.
 *
 * CRITICAL FIX: Uses ref for `onClose` and does NOT include `onClose` in the effect
 * dependencies so re-renders inside parent or modal components never prematurely
 * trigger `history.back()` and close active modals.
 */
export function useModalHistory(isOpen: boolean, onClose: () => void, modalKey = 'modal') {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const statePushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (statePushedRef.current) {
        statePushedRef.current = false;
        try {
          window.history.back();
        } catch {
          // ignore
        }
      }
      return;
    }

    // Modal was just opened: push a history entry
    const uniqueId = `${modalKey}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      window.history.pushState({ modalId: uniqueId, modalKey }, '');
      statePushedRef.current = true;
    } catch {
      // ignore in environments that restrict history
    }

    const onPopState = () => {
      // History has already moved back via user navigation (hardware back button)
      statePushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (statePushedRef.current) {
        statePushedRef.current = false;
        try {
          window.history.back();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, modalKey]);
}
