import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

type SkeletonCardProps = {
    isLoading: boolean;
};

export default function SkeletonCard({ isLoading }: SkeletonCardProps) {
    if (!isLoading) {
        return null;
    }

    return (
        <div className="space-y-6">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="flex flex-col border-t border-b p-4 shadow-sm animate-pulse"
                >
                    {/* Area header row */}
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="h-5 w-32 rounded bg-white/30" />
                        <div className="h-9 w-24 rounded bg-black/40" />
                    </div>
                    {/* 3 venue card skeletons */}
                    <div className="grid gap-4 md:grid-cols-3">
                        {[0, 1, 2].map((j) => (
                            <Card key={j} className="overflow-hidden">
                                {/* image placeholder */}
                                <div className="h-40 w-full bg-muted" />
                                <CardHeader>
                                    <div className="h-4 w-3/4 rounded bg-muted" />
                                    <div className="h-3 w-1/2 rounded bg-muted" />
                                </CardHeader>
                                <CardContent>
                                    <div className="h-3 w-2/3 rounded bg-muted" />
                                </CardContent>
                                <CardFooter>
                                    <div className="h-8 w-24 rounded bg-muted" />
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}