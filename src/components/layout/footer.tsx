import Link from "next/link";
import { Mountain } from "lucide-react";

export function Footer() {
  const socialLinks = [
    { name: "Facebook", href: "#" },
    { name: "Instagram", href: "#" },
    { name: "Twitter", href: "#" },
  ];

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline">Alpina Adventures</span>
          </Link>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-primary">About</Link>
            <Link href="/#adventures" className="hover:text-primary">Adventures</Link>
            <Link href="/contact" className="hover:text-primary">Contact</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          </nav>
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Alpina Adventures. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((link) => (
              <a key={link.name} href={link.href} className="text-muted-foreground hover:text-primary">
                {link.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
