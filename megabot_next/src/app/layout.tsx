import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { DatesProvider } from '@mantine/dates';
import dayjs from 'dayjs';
// import 'dayjs/locale/ru';
import './styles/index.scss';
import { UserProvider } from '@/lib/UserProvider';
import Sidebar from '@/components/layout/Sidebar';
import { MenuProvider } from '@/lib/MenuProvider';

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
				<UserProvider>
					<MenuProvider>
						<DatesProvider settings={{ locale: 'ru' }}>
							<Sidebar />
							<main>{children}</main>
						</DatesProvider>
					</MenuProvider>
				</UserProvider>
			</body>
		</html>
	);
}
