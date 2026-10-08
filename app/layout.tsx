import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://sessionsteps.com'),
  title: {
    default: 'SessionSteps - Keep therapy working between sessions',
    template: '%s | SessionSteps',
  },
  description: 'The clinical continuity platform for behavioral health—connecting session intelligence, between-session engagement, and longitudinal outcomes.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'SessionSteps',
    title: 'SessionSteps - Keep therapy working between sessions',
    description: 'Secure clinical continuity software for behavioral health providers.',
  },
  twitter: {
    card: 'summary',
    title: 'SessionSteps - Keep therapy working between sessions',
    description: 'Secure clinical continuity software for behavioral health providers.',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-background">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
