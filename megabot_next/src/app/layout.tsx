import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './styles/index.scss';
import { AppProvider } from '@/lib/AppProvider';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';

const FontFiraSans = localFont({
	src: [
		{
			path: './fonts/FiraSans-Medium.woff2',
			weight: '500',
			style: 'normal',
		},
		{
			path: './fonts/FiraSans-Bold.woff2',
			weight: '700',
			style: 'normal',
		},
	],
	variable: '--font-fira-sans',
});

const FontRoboto = localFont({
	src: [
		{
			path: './fonts/Roboto-Regular.woff2',
			weight: '400',
			style: 'normal',
		},
		{
			path: './fonts/Roboto-Medium.woff2',
			weight: '500',
			style: 'normal',
		},
		{
			path: './fonts/Roboto-Bold.woff2',
			weight: '700',
			style: 'normal',
		},
	],
	variable: '--font-roboto',
});

export const metadata: Metadata = {
	title: '@MEGABOT_wb',
	description: 'Автоматическое бронирование поставок WB',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='ru' data-theme='megabot'>
			<body
				className={`${FontFiraSans.variable} ${FontRoboto.variable} font-sans`}>
				<AppProvider>
					<Navbar />
					<Sidebar />
					<main>
						<div className='body-overlay overlay-select' />
						{children}
					</main>
					<div className='body-overlay overlay-modal' />
				</AppProvider>
			</body>
		</html>
	);
}
