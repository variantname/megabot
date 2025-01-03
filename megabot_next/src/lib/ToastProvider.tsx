'use client';

import {
	createContext,
	useContext,
	useState,
	ReactNode,
	useCallback,
} from 'react';
import Toast from '@/components/system/Toast';

interface Toast {
	id: string;
	type: 'success' | 'error';
	message: ReactNode;
}

interface ToastContextType {
	showSuccess: (message: ReactNode) => void;
	showError: (message: ReactNode) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const addToast = useCallback(
		(type: 'success' | 'error', message: ReactNode) => {
			const hasDuplicate = toasts.some(
				(toast) => toast.message === message && toast.type === type
			);

			if (hasDuplicate) {
				return;
			}

			const newToast: Toast = {
				id: Math.random().toString(36).substr(2, 9),
				type,
				message,
			};

			setToasts((prev) => [...prev, newToast]);
		},
		[toasts]
	);

	const removeToast = (id: string) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	};

	const showSuccess = (message: ReactNode) => addToast('success', message);
	const showError = (message: ReactNode) => addToast('error', message);

	return (
		<ToastContext.Provider value={{ showSuccess, showError }}>
			{children}
			<div className='toast-container'>
				{toasts.map((toast) => (
					<Toast
						key={toast.id}
						id={toast.id}
						type={toast.type}
						message={toast.message}
						onClose={removeToast}
					/>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export const useToast = () => {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return context;
};
