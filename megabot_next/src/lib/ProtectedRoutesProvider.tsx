'use client';

import { useUser } from '@/lib/UserProvider';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingPage from '@/components/layout/LoadingPage';

export default function ProtectedRoutesProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: session, status } = useSession();
	const router = useRouter();
	const { hasInn, loading } = useUser();

	useEffect(() => {
		if (status === 'unauthenticated') {
			router.push('/login');
			return;
		}

		// Проверяем hasInn только при первой загрузке
		if (!loading && status === 'authenticated' && !hasInn) {
			router.push('/user/sellers');
		}
	}, [status, loading, hasInn, router]);

	if (loading || status === 'loading') {
		return <LoadingPage />;
	}

	return <>{children}</>;
}
