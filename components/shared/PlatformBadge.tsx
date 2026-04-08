import { PlatformId } from '@/types/platforms';
import { PLATFORM_CONFIG } from '@/lib/utils/platformConfig';

const colorMap: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800',
  pink: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800',
};

const dotColor: Record<string, string> = {
  amber: 'bg-amber-400',
  blue: 'bg-blue-400',
  purple: 'bg-purple-400',
  pink: 'bg-pink-400',
};

interface PlatformBadgeProps {
  platform: PlatformId;
  showSpecialty?: boolean;
}

export function PlatformBadge({ platform, showSpecialty }: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[platform];

  return (
    <div className="flex items-center gap-2.5">
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${colorMap[config.badgeColor]}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor[config.badgeColor]}`} />
        {config.name}
      </span>
      {showSpecialty && (
        <span className="text-xs text-muted-foreground">{config.specialty}</span>
      )}
    </div>
  );
}
