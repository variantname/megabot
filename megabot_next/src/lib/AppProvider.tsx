'use client';

import { UserProvider } from './UserProvider';
import { MenuProvider } from './MenuProvider';
import { ToastProvider } from './ToastProvider';
import { DatesProvider } from '@mantine/dates';

export function AppProvider({ children }: { children: React.ReactNode }) {
	return (
		<UserProvider>
			<MenuProvider>
				<DatesProvider settings={{ locale: 'ru' }}>
					<ToastProvider>{children}</ToastProvider>
				</DatesProvider>
			</MenuProvider>
		</UserProvider>
	);
}
