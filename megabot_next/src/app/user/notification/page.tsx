'use client';

import { useUser } from '@/lib/UserProvider';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NotificationPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const { hasInn, loading: userLoading } = useUser();

	useEffect(() => {
		if (!session) {
			router.push('/login');
		}
		if (status === 'authenticated' && !userLoading) {
			if (hasInn) {
				router.push('/user/supplies');
			} else {
				router.push('/user/sellers');
			}
		}
	}, [status, hasInn, userLoading, router]);

	return (
		<div className='content-container'>
			<div className='flex flex-col items-center justify-center'>
				<div className='card bg-base-200 shadow-xl p-8 max-w-md w-full'>
					<h1 className='text-2xl font-bold mb-4 text-center'>
						Регистрация завершена!
					</h1>
					<p className='text-center mb-6'>
						Добро пожаловать в MegaBot! Теперь вы можете настроить своего
						бота.
					</p>
					<div className='flex flex-col gap-4'>
						<button
							onClick={() => router.push('/dashboard')}
							className='btn btn-primary'>
							Перейти в личный кабинет
						</button>
						<button
							onClick={() => router.push('/bot-setup')}
							className='btn btn-secondary'>
							Настроить бота
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
