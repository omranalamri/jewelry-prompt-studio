import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface AnalysisCardProps {
  analysis: Record<string, string>;
}

const labels: Record<string, string> = {
  reference: 'Reference Image',
  assets: 'Jewelry Assets',
  lighting: 'Lighting',
  mood: 'Mood & Aesthetic',
  strategy: 'Creative Strategy',
};

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const entries = Object.entries(analysis).filter(([, v]) => v);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map(([key, value], i) => (
          <div key={key}>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              {labels[key] || key}
            </h4>
            <p className="text-sm leading-relaxed">{value}</p>
            {i < entries.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
