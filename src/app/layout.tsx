import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Nudge | Your AI client memory for freelancers",
  description:
    "Stop losing clients to forgotten follow-ups. Nudge tells you exactly who to reach out to — and why — every morning.",
  openGraph: {
    title: "Nudge",
    description: "Your AI client memory for freelancers.",
    siteName: "Nudge",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
<meta name="theme-color" content="#0c0c0a" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
