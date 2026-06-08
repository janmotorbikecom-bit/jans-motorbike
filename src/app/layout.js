import { Geist } from 'next/font/google';
import './globals.css';
import SidebarNav from '@/components/SidebarNav';

const geist = Geist({ subsets: ['latin'] });

export const metadata = {
  title: "Jan's Motorbike",
  description: 'Quản lý cho thuê xe máy',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className={geist.className} style={{ margin: 0 }}>
        <div style={{ display: 'flex', minHeight: '100vh', background: '#030712' }}>
          <SidebarNav />
          <main style={{ flex: 1, marginLeft: '224px', minHeight: '100vh' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}