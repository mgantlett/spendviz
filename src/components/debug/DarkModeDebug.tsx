import React, { useEffect, useState } from 'react';
import { useUISettingsStore } from '../../store/uiSettings';
import { Button } from '../ui/button';
import { Bug } from 'lucide-react';

export const DarkModeDebug: React.FC = () => {
  const { isDebugVisible, toggleDebug } = useUISettingsStore();
  const [debug, setDebug] = useState({
    htmlClass: '',
    mediaQuery: false,
    systemPreference: false,
    storedTheme: '',
    computedBg: '',
    computedText: '',
  });

  useEffect(() => {
    const updateDebug = () => {
      const computedStyle = window.getComputedStyle(document.documentElement);
      setDebug({
        htmlClass: document.documentElement.classList.toString(),
        mediaQuery: window.matchMedia('(prefers-color-scheme: dark)').matches,
        systemPreference: window.matchMedia('(prefers-color-scheme: dark)').matches,
        storedTheme: localStorage.getItem('theme') || 'none',
        computedBg: computedStyle.getPropertyValue('--background'),
        computedText: computedStyle.getPropertyValue('--foreground'),
      });
    };

    updateDebug();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateDebug);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateDebug();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Also listen for storage changes
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'theme') {
        updateDebug();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mediaQuery.removeEventListener('change', updateDebug);
      observer.disconnect();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <>
      {/* Button (will be placed next to theme toggle by parent) */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleDebug}
        className="hover:bg-accent hover:text-accent-foreground"
        aria-label="Toggle theme debug panel"
      >
        <Bug className="h-4 w-4" />
      </Button>

      {/* Panel (fixed position) */}
      {isDebugVisible && (
        <div className="fixed bottom-16 left-4 p-4 bg-popover border border-border rounded-lg shadow-lg z-50">
          <h3 className="font-bold mb-2 text-popover-foreground">Dark Mode Debug</h3>
          <div className="space-y-1 text-sm text-popover-foreground">
            <p>HTML Classes: <code className="bg-muted px-1 rounded">{debug.htmlClass}</code></p>
            <p>System Dark Mode: <code className="bg-muted px-1 rounded">{debug.systemPreference ? 'Yes' : 'No'}</code></p>
            <p>Stored Theme: <code className="bg-muted px-1 rounded">{debug.storedTheme}</code></p>
            <p>Current Theme: <code className="bg-muted px-1 rounded">{debug.htmlClass.includes('dark') ? 'Dark' : 'Light'}</code></p>
            <p>CSS Variables:</p>
            <ul className="pl-4 space-y-1">
              <li>--background: <code className="bg-muted px-1 rounded">{debug.computedBg}</code></li>
              <li>--foreground: <code className="bg-muted px-1 rounded">{debug.computedText}</code></li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
};
