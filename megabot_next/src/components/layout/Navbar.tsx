'use client';

import Link from 'next/link';
import { useMenu } from '@/lib/MenuProvider';

export default function Navbar() {
	const { isMenuOpen, toggleMenu } = useMenu();

	return (
		<div className='navbar'>
			<div className='logo-container'>
				<Link href='/' className=''>
					MEGABOT
				</Link>
			</div>

			<div className='menu-button'>
				<label>
					<input
						type='checkbox'
						checked={isMenuOpen}
						onChange={toggleMenu}
						name='menu-button'
						id='menu-button'
					/>

					<svg
						className='menu-button-icon open'
						xmlns='http://www.w3.org/2000/svg'
						viewBox='0 0 512 512'>
						<path d='M64,384H448V341.33H64Zm0-106.67H448V234.67H64ZM64,128v42.67H448V128Z' />
					</svg>

					<svg
						className='menu-button-icon close'
						xmlns='http://www.w3.org/2000/svg'
						viewBox='0 0 512 512'>
						<polygon points='400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49' />
					</svg>
				</label>
			</div>
		</div>
	);
}
