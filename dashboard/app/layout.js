export const metadata = {
  title: 'DACL Dashboard',
  description: 'Minimal visibility dashboard for DACL agents and cron jobs.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
