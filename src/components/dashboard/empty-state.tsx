import { Icon, type IconName } from "@/components/ui/icon";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: IconName;
}

export function EmptyState({
  title,
  description,
  icon = "book",
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-muted/60 bg-paper px-5 py-8 text-center">
      <Icon name={icon} className="mx-auto mb-3 size-7 text-leaf" />
      <p className="text-sm font-semibold leading-7 text-forest">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted">
        {description}
      </p>
    </div>
  );
}
