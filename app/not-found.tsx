import Link from 'next/link';
import { Compass } from 'lucide-react';
import { PolarImage } from '@/components/common/polar-image';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container grid items-center gap-10 py-16 md:grid-cols-2">
      <PolarImage variant="penguin" seed="404" alt="A lone penguin looking at an empty ice field" className="aspect-[4/3] rounded-lg" />
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">404 · Off the map</p>
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">This page drifted away on an ice floe</h1>
        <p className="mt-3 text-muted-foreground">
          We couldn’t find what you were looking for. It may have moved, or the link might be mistyped.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/explore">
              <Compass /> Search the archive
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
