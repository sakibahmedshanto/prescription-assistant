import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prescription Assistant',
  description: 'AI-powered medical conversation transcription and analysis system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
