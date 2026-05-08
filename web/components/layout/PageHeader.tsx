// web/components/layout/PageHeader.tsx
interface PageHeaderProps {
    eyebrow?: string;
    title: string;
    description?: string;
}

export default function PageHeader({
    eyebrow,
    title,
    description,
}: PageHeaderProps) {
    return (
        <header className="flex flex-col gap-2">
            {eyebrow && (
                <p className="text-sm font-medium text-violet-400">
                    {eyebrow}
                </p>
            )}

            <h1 className="text-3xl font-bold tracking-tight">
                {title}
            </h1>

            {description && (
                <p className="max-w-3xl text-zinc-400">
                    {description}
                </p>
            )}
        </header>
    );
}