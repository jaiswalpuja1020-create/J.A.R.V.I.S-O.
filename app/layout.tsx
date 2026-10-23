import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'J.A.R.V.I.S.-O - Iron Man AI Command Center',
  description: 'Futuristic movie-inspired J.A.R.V.I.S.-O AI assistant and Stark Industries HUD command center with real-time voice interaction, multi-provider routing, suit diagnostics, and intelligent tools.',
  openGraph: {
    title: 'J.A.R.V.I.S.-O - Iron Man AI Command Center',
    description: 'Futuristic movie-inspired J.A.R.V.I.S.-O AI assistant and Stark Industries HUD command center with real-time voice interaction, multi-provider routing, suit diagnostics, and intelligent tools.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'J.A.R.V.I.S.-O - Iron Man AI Command Center',
    description: 'Futuristic movie-inspired J.A.R.V.I.S.-O AI assistant and Stark Industries HUD command center with real-time voice interaction, multi-provider routing, suit diagnostics, and intelligent tools.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#050b14] text-[#8ae8ff] min-h-screen antialiased selection:bg-[#00e5ff33] selection:text-[#00ffff]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
