"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";
import ThemeQuickSwitch from "./ThemeQuickSwitch";

interface DashboardShellProps {
  title: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export default function DashboardShell({ title, rightSlot, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} rightSlot={rightSlot} />
        <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 pb-24 sm:p-6 sm:pb-24">{children}</main>
      </div>
      <ThemeQuickSwitch />
    </div>
  );
}
