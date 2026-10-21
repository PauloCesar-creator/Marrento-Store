import { useEffect, useRef } from 'react';

/**
 * Synchronizes modal open state with the native browser history stack.
 * Allows Android back button, iOS swipe-back, and desktop Back button to close
 * the modal naturally instead of exiting the page.
 */
export function useModalHistory(isOpen: boolean, onClose: () => void, modalKey = 'modal') {
  const isPushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    // Push state to history
    window.history.pushState({ [modalKey]: true }, '');
    isPushedRef.current = true;

    const onPopState = () => {
      // History has already moved back; mark false so cleanup doesn't back again
      isPushedRef.current = false;
      onClose();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (isPushedRef.current) {
        isPushedRef.current = false;
        try {
          window.history.back();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, onClose, modalKey]);
}
