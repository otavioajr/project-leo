import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeaderProvider } from '@/components/layout/header-context';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <HeaderProvider>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </HeaderProvider>
  );
}
