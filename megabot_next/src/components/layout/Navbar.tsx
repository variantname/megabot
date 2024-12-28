'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useUser } from '@/lib/UserProvider';
import { useState } from 'react';
import { useMenu } from '@/lib/MenuProvider';

export default function Navbar() {
	const pathname = usePathname();
	const { data: session, status } = useSession();
	const { loading: userLoading } = useUser();
	const [isSigningOut, setIsSigningOut] = useState(false);

	// Ждем только загрузку сессии для кнопки входа
	const showLoginButton = status !== 'loading' && !session;
	// Ждем все данные для кнопки выхода
	const showLogoutButton =
		!userLoading && status === 'authenticated' && session;

	const handleSignOut = async () => {
		setIsSigningOut(true);
		try {
			await signOut({ callbackUrl: '/' });
		} finally {
			setIsSigningOut(false);
		}
	};

	const menuItems = [
		{ path: '/', icon: '🏠', label: 'Главная' },
		{ path: '/about', icon: '💰', label: 'Тарифы' },
		{ path: '/user/supplies', icon: '⚙️', label: 'Личный кабинет' },
	];

	const { isMenuOpen, toggleMenu } = useMenu();

	return (
		<div className='navbar bg-base-200 fixed top-0 left-0 right-0 z-50'>
			<div className='logo-container'>
				<Link href='/' className='btn btn-ghost text-xl'>
					MegaBot WB
				</Link>
			</div>

			<ul className='menu menu-horizontal menu-lg bg-base-200 rounded-box'>
				{menuItems.map((item) => (
					<li key={item.path}>
						<Link
							href={item.path}
							className={`menu-item ${
								pathname === item.path ? 'active' : ''
							}`}>
							<span className='menu-icon'>{item.icon}</span>
							<span className='menu-label'>{item.label}</span>
						</Link>
					</li>
				))}
			</ul>

			<div className='login-logout-buttons'>
				{showLoginButton && (
					<Link href='/login'>
						<button className='btn btn-md btn-primary'>Войти</button>
					</Link>
				)}
				{showLogoutButton && (
					<button
						onClick={handleSignOut}
						disabled={isSigningOut}
						className='btn btn-md btn-error'>
						{isSigningOut ? 'Выхожу...' : 'Выйти'}
					</button>
				)}
			</div>

			<div className='menu-button'>
				<label className='btn btn-circle swap swap-rotate'>
					<input
						type='checkbox'
						checked={isMenuOpen}
						onChange={toggleMenu}
					/>

					<svg
						className='swap-off fill-current'
						xmlns='http://www.w3.org/2000/svg'
						width='32'
						height='32'
						viewBox='0 0 512 512'>
						<path d='M64,384H448V341.33H64Zm0-106.67H448V234.67H64ZM64,128v42.67H448V128Z' />
					</svg>

					<svg
						className='swap-on fill-current'
						xmlns='http://www.w3.org/2000/svg'
						width='32'
						height='32'
						viewBox='0 0 512 512'>
						<polygon points='400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49' />
					</svg>
				</label>
			</div>
		</div>
	);
}
