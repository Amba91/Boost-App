export const metadata = {
  title: "Boost",
  description: "More sales. Less effort.",
  icons: {
    icon: "/favicon.png",
    apple: "/logo.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  )
}
