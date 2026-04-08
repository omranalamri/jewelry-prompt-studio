import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TipsCardProps {
  tips: string[];
}

export function TipsCard({ tips }: TipsCardProps) {
  if (tips.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pro Tips</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-amber-500 shrink-0">*</span>
              <span className="leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
