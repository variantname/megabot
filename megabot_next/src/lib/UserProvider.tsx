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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Компонент с данными пользователя
function UserDataProvider({ children }: { children: ReactNode }) {
	const { data: session } = useSession();
	const [hasInn, setHasInn] = useState(false);
	const [loading, setLoading] = useState(true);

	const refreshUserData = async () => {
		try {
			const response = await fetch('/api/user/data');
			const data = await response.json();
			data.user?.sellers?.some((seller: Seller) => seller.seller_id) ||
				false;
		} catch (error) {
			console.error('Error fetching user data:', error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (session) {
			refreshUserData();
		}
	}, [session]);

	return (
		<UserContext.Provider value={{ hasInn, loading, refreshUserData }}>
			{children}
		</UserContext.Provider>
	);
}

// Главный провайдер, объединяющий сессию и данные
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
