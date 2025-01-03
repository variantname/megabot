// src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useUser } from '@/lib/UserProvider';
import { useEffect, useState } from 'react';
import { useMenu } from '@/lib/MenuProvider';

export default function Sidebar() {
	const pathname = usePathname();
	const { data: session, status } = useSession();
	const { hasInn, loading: userLoading, userAccess } = useUser();
	const [isSigningOut, setIsSigningOut] = useState(false);

	// Не показываем сайдбар если:
	// - страница загружается
	// - пользователь не авторизован
	// - находимся на главной странице
	// - загружаются данные пользователя
	const shouldShowSidebar =
		// status === 'authenticated' && pathname !== '/' && !userLoading;
		status === 'authenticated' && pathname !== '/' && !userLoading;

	const handleSignOut = async () => {
		setIsSigningOut(true);
		try {
			await signOut({ callbackUrl: '/' });
		} finally {
			setIsSigningOut(false);
		}
	};

	useEffect(() => {
		if (shouldShowSidebar) {
			document.body.classList.add('has-sidebar');
			return () => document.body.classList.remove('has-sidebar');
		}
	}, [shouldShowSidebar]);

	const { closeMenu } = useMenu();

	const menuItems = [
		{
			path: '/user/dashboard',
			icon: '📊',
			label: 'Статистика',
			show: userAccess.canAccessDashboard,
		},
		{
			path: '/user/supplies',
			icon: '📦',
			label: 'Поставки',
			show: userAccess.canAccessSupplies,
		},
		{
			path: '/user/sellers',
			icon: '🛒',
			label: 'Твои магазины',
			show: true, // всегда показываем
		},
		{
			path: '/user/settings',
			icon: '⚙️',
			label: 'Настройки',
			show: userAccess.canAccessSettings,
		},
		{
			path: '/user/tariff',
			icon: '💰',
			label: 'Твой тариф',
			show: userAccess.canAccessTariff,
		},
	];

	// Всегда рендерим div, но с разным содержимым
	return (
		<div className='sidebar-wrapper'>
			{shouldShowSidebar && (
				<aside className='sidebar'>
					<div className='logo-wrapper'>MEGABOT</div>
					<div className='main-menu-wrapper'>
						<div className='main-menu'>
							{menuItems
								.filter((item) => item.show)
								.map((item) => (
									<Link
										key={item.path}
										href={item.path}
										onClick={closeMenu}
										className={`thing ${
											pathname === item.path ? 'active' : ''
										}`}>
										<span className='emoji c'>{item.icon}</span>
										<span className='emoji-label'>{item.label}</span>
										<span className='active-label'>→</span>
									</Link>
								))}
						</div>
					</div>

					<div className='account-wrapper'>
						<div className='hello-human'>
							<span className='emoji o2'>❤️</span>
							<span className='human-name'>
								здравствуй,
								<br /> {session?.user?.email}
							</span>
						</div>

						<button
							onClick={handleSignOut}
							disabled={isSigningOut}
							className='btn btn-o'>
							<span className='btn-label'>
								{isSigningOut ? 'Выхожу...' : 'Выйти'}
							</span>
						</button>
					</div>
				</aside>
			)}
		</div>
	);
}
