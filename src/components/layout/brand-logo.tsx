export function BrandLogo({ variant = 'default' }: { variant?: 'default' | 'light' }) {
  const colorClass = variant === 'light' ? 'text-white' : 'text-primary';
  return (
    <span className="flex flex-col items-center justify-center">
      <span className={`font-brand ${colorClass} text-[30px] leading-[30px]`}>
        chaves
      </span>
      <span className={`font-adventure ${colorClass}`}>
        adventure
      </span>
    </span>
  );
}
