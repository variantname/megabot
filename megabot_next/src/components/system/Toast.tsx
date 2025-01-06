import { ReactNode, useEffect, useRef, useState } from 'react';

interface ToastProps {
	id: string;
	type: 'success' | 'error';
	message: ReactNode;
	onClose: (id: string) => void;
	duration?: number | null;
}

export default function Toast({
	id,
	type,
	message,
	onClose,
	duration = 5000,
}: ToastProps) {
	const [isHiding, setIsHiding] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const removeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		// Плавное появление
		requestAnimationFrame(() => {
			setIsVisible(true);
		});

		if (duration) {
			const timer = setTimeout(() => handleClose(), duration);
			return () => clearTimeout(timer);
		}
	}, [duration, id]);

	const handleClose = () => {
		setIsHiding(true);

		removeTimeoutRef.current = setTimeout(() => {
			onClose(id);
		}, 1000);
	};

	useEffect(() => {
		return () => {
			if (removeTimeoutRef.current) {
				clearTimeout(removeTimeoutRef.current);
			}
		};
	}, []);

	return (
		<div
			className={`toast toast-${type} ${isVisible ? 'toast-visible' : ''} ${
				isHiding ? 'toast-hiding' : ''
			}`}>
			<div className='toast-content'>
				<div className='toast-message'>{message}</div>
				<button
					onClick={handleClose}
					className='toast-close'
					aria-label='Закрыть'>
					×
				</button>
			</div>
		</div>
	);
}
