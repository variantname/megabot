import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	children:
		| React.ReactNode
		| ((props: { handleClose: () => void }) => React.ReactNode);
	className?: string;
	closeOnBlur?: boolean;
}

export default function Modal({
	isOpen,
	onClose,
	title,
	children,
	className = '',
	closeOnBlur = false,
}: ModalProps) {
	const [isClosing, setIsClosing] = useState(false);

	const handleClose = () => {
		setIsClosing(true);
		document.body.classList.remove('modal-show');
		setTimeout(() => {
			setIsClosing(false);
			onClose();
		}, 300);
	};

	const childrenWithClose =
		typeof children === 'function' ? children({ handleClose }) : children;

	useEffect(() => {
		if (isOpen) {
			requestAnimationFrame(() => {
				document.body.classList.add('modal-show');
			});
		}
	}, [isOpen]);

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') handleClose();
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
		}

		return () => {
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen, closeOnBlur]);

	if (!isOpen && !isClosing) return null;

	return createPortal(
		<>
			<div
				className={`modal-content card ${className}`}
				role='dialog'
				aria-modal='true'>
				{title && (
					<div className='modal-header'>
						<h2>{title}</h2>
					</div>
				)}
				<div className='modal-body'>{childrenWithClose}</div>
				<button
					onClick={handleClose}
					className='btn btn-b'
					aria-label='Закрыть'>
					<span className='btn-label'>Отменить</span>
				</button>
			</div>
		</>,
		document.body
	);
}
