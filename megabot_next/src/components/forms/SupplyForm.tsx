'use client';

import { useState } from 'react';
import { Supply } from '@/types/types';
import Input from '@/components/forms/Input';
import { useToast } from '@/lib/ToastProvider';

interface SupplyFormProps {
	initialData?: Supply;
	onSuccess: (supply: Supply) => void;
	onError: (error: string) => void;
}

export default function SupplyForm({
	initialData,
	onSuccess,
	onError,
}: SupplyFormProps) {
	const { showError } = useToast();
	const [loading, setLoading] = useState(false);
	const [supply, setSupply] = useState<Partial<Supply>>(
		initialData || {
			preorder_id: '',
			booking_settings: {
				mode: null,
				target_dates: [],
				priority: null,
				target_coeff: '1.0',
			},
			status: {
				active: false,
				attempts_count: 0,
				booked: false,
				supply_id: null,
			},
		}
	);

	const validateSupply = (
		data: Partial<Supply>
	): { isValid: boolean; error?: string } => {
		if (!data.preorder_id?.trim()) {
			return { isValid: false, error: 'Укажите номер поставки' };
		}
		if (!data.booking_settings?.target_dates?.length) {
			return { isValid: false, error: 'Выберите даты поставки' };
		}
		return { isValid: true };
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const validation = validateSupply(supply);
		if (!validation.isValid) {
			showError(validation.error || 'Проверьте данные формы');
			return;
		}

		setLoading(true);
		try {
			const response = await fetch('/api/supply/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(supply),
			});

			if (!response.ok) {
				throw new Error('Ошибка при создании поставки');
			}

			const newSupply = await response.json();
			onSuccess(newSupply);
		} catch (err) {
			onError(err instanceof Error ? err.message : 'Неизвестная ошибка');
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} noValidate>
			<Input
				name='preorder_id'
				value={supply.preorder_id}
				onChange={(e) =>
					setSupply((prev) => ({ ...prev, preorder_id: e.target.value }))
				}
				placeholder='Номер поставки'
				disabled={loading}
				legend='Номер поставки из WB'
				autoFocus
			/>

			{/* TODO: Добавить DatePicker для target_dates */}
			{/* TODO: Добавить селект для mode и priority */}

			<div className='form-actions'>
				<button type='submit' className='btn btn-w' disabled={loading}>
					<span className='btn-label'>
						{loading ? 'Создаю...' : 'Создать поставку'}
					</span>
				</button>
			</div>
		</form>
	);
}
