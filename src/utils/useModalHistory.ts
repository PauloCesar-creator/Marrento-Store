import { useEffect, useRef } from 'react';

/**
 * Synchronizes modal open state with the native browser history stack.
 * Allows Android hardware back button, iOS swipe-back, and desktop Back button
 * to close the modal naturally instead of exiting the page.
 *
 * CRITICAL FIX:
 * 1. Uses ref for `onClose` so re-renders inside parent or modal components never prematurely close modals.
 * 2. Adds a 350ms grace period so asynchronous browser history reconciliation or StrictMode test unmounts
 *    never immediately close the modal right after the user clicks to open it.
 */
export function useModalHistory(isOpen: boolean, onClose: () => void, modalKey = 'modal') {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const statePushedRef = useRef(false);
  const openedAtRef = useRef<number>(0);

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
    openedAtRef.current = Date.now();

    try {
      window.history.pushState({ modalId: uniqueId, modalKey }, '');
      statePushedRef.current = true;
    } catch {
      // ignore in environments that restrict history
    }

    const onPopState = () => {
      // Prevent phantom popstate events from immediately closing newly opened modals (<350ms)
      if (Date.now() - openedAtRef.current < 350) {
        return;
      }
      // History has already moved back via user navigation (hardware back button)
      statePushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      // Only rollback history if the modal was genuinely open for a noticeable duration
      if (statePushedRef.current && Date.now() - openedAtRef.current >= 350) {
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
