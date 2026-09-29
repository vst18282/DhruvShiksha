import { redirect } from 'next/navigation';

/** Short top-nav route retained for bookmarks; the feature itself uses two explicit pages. */
export default function Page({ searchParams }: { searchParams: { view?: string; point?: string } }) {
  const mode = searchParams.view === '3d' ? '3d' : '2d';
  const point = searchParams.point ? `?point=${encodeURIComponent(searchParams.point)}` : '';
  redirect(`/tools/polar-map/${mode}${point}`);
}
