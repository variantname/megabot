'use client';

import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Seller, User, Supply } from '@/types/types';
import LoadingPage from '@/components/layout/LoadingPage';

interface UserContextType {
	user: User | null;
	sellers: Seller[];
	loading: boolean;
	refreshUserData: () => Promise<void>;
	refreshSellers: () => Promise<void>;
	userAccess: {
		canAccessSupplies: boolean;
		canAccessDashboard: boolean;
		canAccessSettings: boolean;
		canAccessTariff: boolean;
	};
	pageLoading: boolean;
	dataLoading: boolean;
	supplies: Supply[];
	setSupplies: React.Dispatch<React.SetStateAction<Supply[]>>;
	selectedSellerId: string;
	setSelectedSellerId: (id: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function UserDataProvider({ children }: { children: ReactNode }) {
	const { data: session, status: authStatus } = useSession();
	const router = useRouter();
	const pathname = usePathname();

	// Состояния загрузки
	const [pageLoading, setPageLoading] = useState(true);
	const [dataLoading, setDataLoading] = useState(true);

	// Данные
	const [user, setUser] = useState<User | null>(null);
	const [sellers, setSellers] = useState<Seller[] | null>(null);
	const [supplies, setSupplies] = useState<Supply[]>([]);
	const [selectedSellerId, setSelectedSellerId] = useState<string>('');

	const refreshUserData = async () => {
		try {
			const response = await fetch('/api/user');
			if (!response.ok) {
				console.error('Failed to fetch user data:', response.status);
				setUser(null);
				return;
			}
			const data = await response.json();
			setUser(data.user);
		} catch (error) {
			console.error('Error fetching user data:', error);
			setUser(null);
		}
	};

	const refreshSellers = async () => {
		try {
			const response = await fetch('/api/seller');
			if (!response.ok) {
				console.error('Failed to fetch sellers:', response.status);
				setSellers([]);
				return;
			}
			const data = await response.json();
			setSellers(data.sellers || []);
		} catch (error) {
			console.error('Error fetching sellers:', error);
			setSellers([]);
		}
	};

	// Загрузка поставок при изменении выбранного магазина
	useEffect(() => {
		if (!selectedSellerId || !sellers) return;

		const fetchSupplies = async () => {
			try {
				if (selectedSellerId === 'all') {
					const allSupplies: Supply[] = [];
					for (const seller of sellers) {
						const response = await fetch(
							`/api/supply?seller_id=${seller.seller_id}`
						);
						if (response.ok) {
							const data = await response.json();
							allSupplies.push(...(data.supplies || []));
						}
					}
					setSupplies(allSupplies);
					return;
				}

				const response = await fetch(
					`/api/supply?seller_id=${selectedSellerId}`
				);
				if (!response.ok) throw new Error('Ошибка при загрузке поставок');
				const data = await response.json();
				setSupplies(data.supplies || []);
			} catch (error) {
				console.error('Error fetching supplies:', error);
				setSupplies([]);
			}
		};

		fetchSupplies();
	}, [selectedSellerId, sellers]);

	// Установка начального значения selectedSellerId
	useEffect(() => {
		if (!selectedSellerId && sellers && sellers.length > 0) {
			setSelectedSellerId(sellers[0].seller_id);
		}
	}, [sellers, selectedSellerId]);

	// Первичная загрузка данных
	useEffect(() => {
		const loadInitialData = async () => {
			if (authStatus === 'authenticated') {
				setDataLoading(true);
				try {
					await Promise.all([refreshUserData(), refreshSellers()]);
					// Если есть sellers, сразу загружаем поставки для первого магазина
					if (sellers && sellers.length > 0) {
						const firstSellerId = sellers[0].seller_id;
						setSelectedSellerId(firstSellerId);
						const response = await fetch(
							`/api/supply?seller_id=${firstSellerId}`
						);
						if (response.ok) {
							const data = await response.json();
							setSupplies(data.supplies || []);
						}
					}
				} catch (error) {
					console.error('Error loading initial data:', error);
				}
				setDataLoading(false);
			}
			setPageLoading(false);
		};

		if (authStatus !== 'loading') {
			loadInitialData();
		}
	}, [authStatus]);

	// Обработка редиректов
	useEffect(() => {
		const handleRedirects = () => {
			const publicPaths = ['/', '/login', '/register', '/forgot-password'];
			const userRestrictedPaths = [
				'/login',
				'/register',
				'/forgot-password',
			];
			const protectedPaths = [
				'/user/supplies',
				'/user/dashboard',
				'/user/settings',
			];

			const isPublicPath = publicPaths.includes(pathname);
			const isUserRestrictedPath = userRestrictedPaths.includes(pathname);
			const isProtectedPath = protectedPaths.some((path) =>
				pathname.startsWith(path)
			);

			// Редирект неавторизованных пользователей
			if (authStatus === 'unauthenticated' && !isPublicPath) {
				router.push('/login');
				return;
			}

			// Редирект авторизованных с публичных страниц
			if (authStatus === 'authenticated' && isUserRestrictedPath) {
				router.push('/user/supplies');
				return;
			}

			// Проверка наличия магазинов для защищенных путей
			if (
				authStatus === 'authenticated' &&
				isProtectedPath &&
				!dataLoading &&
				(!sellers || sellers.length === 0) &&
				pathname !== '/user/sellers'
			) {
				router.push('/user/sellers');
				return;
			}
		};

		if (authStatus !== 'loading') {
			handleRedirects();
		}
	}, [authStatus, pathname, sellers, dataLoading]);

	const userAccess = {
		canAccessSupplies: Boolean(sellers && sellers.length > 0),
		canAccessDashboard: Boolean(sellers && sellers.length > 0),
		canAccessSettings: Boolean(sellers && sellers.length > 0),
		canAccessTariff: true,
	};

	// Показываем LoadingPage только при реальной загрузке
	if (authStatus === 'loading' || pageLoading) {
		return <LoadingPage />;
	}

	return (
		<UserContext.Provider
			value={{
				user,
				sellers: sellers || [],
				loading: dataLoading,
				refreshUserData,
				refreshSellers,
				userAccess,
				pageLoading,
				dataLoading,
				supplies,
				setSupplies,
				selectedSellerId,
				setSelectedSellerId,
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
