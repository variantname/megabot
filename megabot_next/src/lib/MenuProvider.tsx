'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface MenuContextType {
	isMenuOpen: boolean;
	toggleMenu: () => void;
	closeMenu: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const toggleMenu = () => {
		const newState = !isMenuOpen;
		setIsMenuOpen(newState);
		document.body.classList.toggle('menu-active', newState);
	};

	const closeMenu = () => {
		setIsMenuOpen(false);
		document.body.classList.remove('menu-active');
	};

	return (
		<MenuContext.Provider value={{ isMenuOpen, toggleMenu, closeMenu }}>
			{children}
		</MenuContext.Provider>
	);
}

export const useMenu = () => {
	const context = useContext(MenuContext);
	if (context === undefined) {
		throw new Error('useMenu must be used within a MenuProvider');
	}
	return context;
};
