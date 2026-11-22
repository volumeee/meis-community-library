import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useI18n } from '../../store/useLocaleStore';

interface BookCoverProps {
  src?: string;
  title: string;
  author?: string;
  genre?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const GENRE_PALETTES: Record<string, string> = {
  Science: 'from-[#162844] to-[#0f1d33] text-slate-100',
  Technology: 'from-[#173642] to-[#0f252e] text-slate-100',
  Fiction: 'from-[#283852] to-[#1a2538] text-slate-100',
  Mystery: 'from-[#1f2937] to-surface-dark text-slate-100',
  Fantasy: 'from-[#2b314d] to-[#191d30] text-slate-100',
  History: 'from-[#3b332b] to-[#241f1a] text-amber-50',
  Biography: 'from-[#313847] to-[#1f2430] text-slate-100',
  Philosophy: 'from-[#2f353b] to-[#1d2126] text-slate-100',
  'Non-Fiction': 'from-[#293a4a] to-[#192530] text-slate-100',
  Children: 'from-[#234357] to-[#162b38] text-slate-100',
};

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-9 h-12 rounded',
  md: 'w-24 h-32 rounded-md',
  lg: 'w-40 sm:w-44 aspect-[3/4] rounded-lg',
};

export function BookCover({
  src,
  title,
  author,
  genre,
  size = 'md',
  className = '',
}: BookCoverProps) {
  const { locale, t } = useI18n();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const showImage = Boolean(src && src.trim().length > 0 && !hasError);
  const palette =
    (genre && GENRE_PALETTES[genre]) || 'from-accent to-[#10233b] text-slate-100';

  if (showImage) {
    return (
      <div
        aria-hidden={size === 'sm' ? true : undefined}
        className={`relative shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 ${SIZE_CLASSES[size]} ${className}`}
      >
        <img
          src={src}
          alt={
            size === 'sm' ? '' : locale === 'id' ? `Sampul ${title}` : `Cover of ${title}`
          }
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/25 to-transparent"
        />
      </div>
    );
  }

  return (
    <div
      role={size === 'sm' ? undefined : 'img'}
      aria-hidden={size === 'sm' ? true : undefined}
      aria-label={
        size === 'sm'
          ? undefined
          : locale === 'id'
            ? `Sampul default ${title}`
            : `Default cover for ${title}`
      }
      className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${palette} border border-slate-300/40 dark:border-slate-700/80 select-none flex flex-col justify-between ${SIZE_CLASSES[size]} ${
        size === 'sm'
          ? 'p-1.5 items-center justify-center'
          : size === 'md'
            ? 'p-2.5'
            : 'p-4'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent"
      />
      {size === 'sm' ? (
        <BookOpen className="h-4 w-4 opacity-75" aria-hidden="true" />
      ) : (
        <>
          <div className="pl-1" aria-hidden="true">
            {genre && (
              <p className="text-[10px] font-medium opacity-70 truncate">{genre}</p>
            )}
            <p
              className={`font-display font-semibold leading-snug line-clamp-3 mt-1 ${
                size === 'lg' ? 'text-sm' : 'text-xs'
              }`}
            >
              {title || t.bookForm.defaultCoverTitle}
            </p>
          </div>
          <div
            className="pl-1 flex items-center justify-between gap-1 opacity-70"
            aria-hidden="true"
          >
            <span className="text-[10px] truncate">{author || t.meta.brandShort}</span>
            <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </div>
        </>
      )}
    </div>
  );
}
