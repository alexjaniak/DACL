import './globals.css';

export const metadata = {
  title: 'Ops Dashboard',
  description: 'Operational dashboard shell for planner/worker activity'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
