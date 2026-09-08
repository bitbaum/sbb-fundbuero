'use client';

import { useState, useEffect } from 'react';
import { SignalIcon, WifiIcon, BatteryIcon } from '@/components/ui/icons';

export function StatusBar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('de-CH', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="status-bar-sim safe-top">
      <div className="flex items-center gap-1">
        <span>{time || '9:41'}</span>
      </div>
      <div className="flex items-center gap-1">
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </div>
    </div>
  );
}
