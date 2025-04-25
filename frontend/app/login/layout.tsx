import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BOH - 登录',
  description: '登录到BOH AI视频生成系统',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="login-layout">
      {children}
    </main>
  );
} 