'use client';

import { useSession } from 'next-auth/react';
import { useUser } from '@/lib/UserProvider'; // Обновленный импорт
import Link from 'next/link';

export default function Home() {
	const { data: session } = useSession();
	const { hasInn } = useUser();

	const getCtaButton = () => {
		if (!session) {
			return (
				<Link href='/login' className='btn btn-primary btn-cta'>
					Поймать заветный слот
				</Link>
			);
		}

		if (!hasInn) {
			return (
				<Link href='/user/inn' className='btn btn-primary btn-cta'>
					Завершить настройку
				</Link>
			);
		}

		return (
			<Link href='/user/supplies' className='btn btn-primary btn-cta'>
				Перейти к поставкам
			</Link>
		);
	};

	return (
		<div className='hero min-h-[80vh]'>
			<div className='hero-content'>
				<div className='max-w-md'>
					<h1 className='header-1'>Я @MEGABOT</h1>
					<h2 className='header-2'>бронирую поставки</h2>
					<h2 className='header-2'>на Wildberries</h2>
					<h2 className='header-2'>автоматически 24/7</h2>
					<h2 className='header-2'>без влюченных компов и браузеров</h2>
					{getCtaButton()}
				</div>
			</div>
		</div>
	);
}
