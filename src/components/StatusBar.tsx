"use client";

import { useEffect, useState } from "react";

export default function StatusBar({ connected }: { connected: boolean }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex justify-between items-center px-2 py-0.5 bg-bb-dark border-t border-bb-border text-[10px]">
      <div className="flex gap-4">
        <span className="text-bb-orange font-bold">BLOOMBERG</span>
        <span className="text-bb-muted">TAB: SEARCH | ↑↓: NAV | ENTER: SELECT | ESC: BACK | F: FILTER | R: REGION</span>
      </div>
      <div className="flex gap-4">
        <span className={connected ? "text-bb-green" : "text-bb-red"}>
          {connected ? "● CONNECTED" : "○ DISCONNECTED"}
        </span>
        <span className="text-bb-muted">{time} UTC</span>
      </div>
    </div>
  );
}
