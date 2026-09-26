import { ComingSoon } from '@/components/common/ComingSoon';
import { PageHeader } from '@/components/common/PageHeader';
import type { BreadcrumbItem } from '@/types';
import type { LucideIcon } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  comingSoonDescription?: string;
  icon: LucideIcon;
  breadcrumbs?: BreadcrumbItem[];
}

export function PlaceholderPage({ title, description, comingSoonDescription, icon: Icon, breadcrumbs }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} />
      <ComingSoon title={title} description={comingSoonDescription} icon={<Icon className="h-8 w-8" />} />
    </div>
  );
}
