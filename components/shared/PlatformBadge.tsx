import { PlatformId } from '@/types/platforms';
import { PLATFORM_CONFIG } from '@/lib/utils/platformConfig';
import { Badge } from '@/components/ui/badge';

const colorMap: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  pink: 'bg-pink-100 text-pink-800 border-pink-200',
};

interface PlatformBadgeProps {
  platform: PlatformId;
  showSpecialty?: boolean;
}

export function PlatformBadge({ platform, showSpecialty }: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[platform];

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={colorMap[config.badgeColor]}>
        {config.name}
      </Badge>
      {showSpecialty && (
        <span className="text-xs text-muted-foreground">{config.specialty}</span>
      )}
    </div>
  );
}
