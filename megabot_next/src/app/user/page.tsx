'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/UserProvider';
import { useEffect } from 'react';

export default function UserPage() {
	const { data: session, status } = useSession();
	const { hasInn, loading: userLoading } = useUser();
	const router = useRouter();

	useEffect(() => {
		// Ждем загрузку всех данных
		if (status === 'loading' || userLoading) {
			return;
		}

		// Делаем редиректы только после полной загрузки
		if (status === 'unauthenticated') {
			router.push('/login');
			return;
		}

		if (hasInn) {
			router.push('/user/supplies');
		} else {
			router.push('/user/sellers');
		}
	}, [status, hasInn, userLoading, router]);

	// Показываем загрузку пока идет редирект
	return (
		<div className='flex justify-center items-center min-h-screen'>
			<span className='loading loading-spinner loading-lg'></span>
		</div>
	);
}
