'use client';

import { useState, useRef, useEffect } from 'react';
import { SelectProps } from '@/types/types';

export default function Select({
	legend,
	id,
	name,
	options,
	value,
	onChange,
	disabled,
	...props
}: SelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedOption, setSelectedOption] = useState(
		options.find((opt) => opt.value === value) || options[0]
	);
	const selectRef = useRef<HTMLDivElement>(null);

	// Управление классом для body при открытии/закрытии
	useEffect(() => {
		if (isOpen) {
			requestAnimationFrame(() => {
				document.body.classList.add('select-show');
			});
		}

		return () => {
			document.body.classList.remove('select-show');
		};
	}, [isOpen]);

	const handleClose = () => {
		document.body.classList.remove('select-show');
		setIsOpen(false);
	};

	// Закрываем при клике вне селекта
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				selectRef.current &&
				!selectRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () =>
			document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Обработка клавиатурной навигации
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (disabled) return;

		switch (e.key) {
			case 'Enter':
			case ' ':
				setIsOpen(!isOpen);
				break;
			case 'Escape':
				setIsOpen(false);
				break;
			case 'ArrowDown':
				if (!isOpen) {
					setIsOpen(true);
				}
				break;
		}
	};

	const handleSelect = (option: { value: string; label: string }) => {
		setSelectedOption(option);
		handleClose();
		if (onChange) {
			const event = {
				target: { value: option.value },
			} as React.ChangeEvent<HTMLSelectElement>;
			onChange(event);
		}
	};

	// Обработчик открытия с RAF для плавной анимации
	const handleToggle = () => {
		if (disabled) return;

		requestAnimationFrame(() => {
			setIsOpen(!isOpen);
		});
	};

	return (
		<div className='form-control'>
			<div
				ref={selectRef}
				className={`custom-select ${isOpen ? 'open' : ''} ${
					disabled ? 'disabled' : ''
				}`}
				tabIndex={disabled ? -1 : 0}
				onKeyDown={handleKeyDown}
				role='combobox'
				aria-expanded={isOpen}
				aria-haspopup='listbox'
				aria-disabled={disabled}>
				<div className='select-selected' onClick={handleToggle}>
					{selectedOption.label}
				</div>
				<div className='select-options' role='listbox'>
					{options.map((option) => (
						<div
							key={option.value}
							className={`select-option ${
								option.value === selectedOption.value ? 'selected' : ''
							}`}
							onClick={() => handleSelect(option)}
							role='option'
							aria-selected={option.value === selectedOption.value}>
							{option.label}
						</div>
					))}
				</div>
			</div>
			{legend && <div className='input-legend'>{legend}</div>}
		</div>
	);
}
