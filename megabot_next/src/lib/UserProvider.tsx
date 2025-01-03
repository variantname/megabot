'use client';

import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { Seller } from '@/types/types';

interface UserContextType {
	hasInn: boolean;
	loading: boolean;
	refreshUserData: () => Promise<void>;
	userAccess: {
		canAccessSupplies: boolean;
		canAccessDashboard: boolean;
		canAccessSettings: boolean;
		canAccessTariff: boolean;
	};
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function UserDataProvider({ children }: { children: ReactNode }) {
	const { data: session } = useSession();
	const [hasInn, setHasInn] = useState(false);
	const [loading, setLoading] = useState(true);

	const refreshUserData = async () => {
		try {
			const response = await fetch('/api/user/data');
			const data = await response.json();
			const hasSellerWithInn =
				data.user?.sellers?.some((seller: Seller) => seller.seller_id) ||
				false;
			setHasInn(hasSellerWithInn);
		} catch (error) {
			console.error('Error fetching user data:', error);
			setHasInn(false);
		} finally {
			setLoading(false);
		}
	};

	const userAccess = {
		canAccessSupplies: hasInn,
		canAccessDashboard: hasInn,
		canAccessSettings: hasInn,
		canAccessTariff: true,
	};

	// Загружаем данные только при изменении сессии
	useEffect(() => {
		if (session) {
			refreshUserData();
		} else {
			setHasInn(false);
			setLoading(false);
		}
	}, [session]);

	return (
		<UserContext.Provider
			value={{
				hasInn,
				loading,
				refreshUserData,
				userAccess,
			}}>
			{children}
		</UserContext.Provider>
	);
}

export function UserProvider({ children }: { children: ReactNode }) {
	return (
		<SessionProvider>
			<UserDataProvider>{children}</UserDataProvider>
		</SessionProvider>
	);
}

export const useUser = () => {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error('useUser must be used within a UserProvider');
	}
	return context;
};
