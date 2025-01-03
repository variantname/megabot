'use client';

import { UserProvider } from './UserProvider';
import { MenuProvider } from './MenuProvider';
import { ToastProvider } from './ToastProvider';
import { DatesProvider } from '@mantine/dates';
import ProtectedRoutesProvider from './ProtectedRoutesProvider';

export function AppProvider({ children }: { children: React.ReactNode }) {
	return (
		<UserProvider>
			<ProtectedRoutesProvider>
				<MenuProvider>
					<DatesProvider settings={{ locale: 'ru' }}>
						<ToastProvider>{children}</ToastProvider>
					</DatesProvider>
				</MenuProvider>
			</ProtectedRoutesProvider>
		</UserProvider>
	);
}
