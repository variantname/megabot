'use client';

import { useState } from 'react';
import { Supply } from '@/types/types';
import Input from '@/components/forms/Input';

interface SupplyFormProps {
	initialData?: Supply;
	sellerId: string;
	onSuccess: (supply: Supply) => void;
	onError: (error: string) => void;
	apiEndpoint: string;
}

export default function SupplyForm({
	initialData,
	sellerId,
	onSuccess,
	onError,
	apiEndpoint,
}: SupplyFormProps) {
	const [loading, setLoading] = useState(false);

	const [supply, setSupply] = useState<Supply>(
		initialData
			? {
					...initialData,
					_id: initialData._id,
			  }
			: {
					task_id: `task_${Date.now()}`,
					preorder_id: '',
					booking_settings: {
						mode: 'auto',
						target_dates: [],
						priority: 'normal',
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
		data: Supply
	): { isValid: boolean; error?: string } => {
		if (!data.preorder_id?.trim()) {
			return { isValid: false, error: 'Укажите номер поставки' };
		}
		return { isValid: true };
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const validation = validateSupply(supply);
			if (!validation.isValid) {
				onError(validation.error || 'Ошибка валидации');
				return;
			}

			const method = initialData ? 'PUT' : 'POST';
			const url = initialData
				? `${apiEndpoint}?id=${initialData._id}&seller_id=${sellerId}`
				: `${apiEndpoint}?seller_id=${sellerId}`;

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(supply),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Ошибка при сохранении');
			}

			const data = await response.json();
			onSuccess(data.supply);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Ошибка при сохранении';
			onError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} noValidate>
			<Input
				id='preorder_id'
				name='preorder_id'
				value={supply.preorder_id}
				onChange={(e) =>
					setSupply((prev) => ({ ...prev, preorder_id: e.target.value }))
				}
				placeholder='Например: WB-GI-123456'
				disabled={loading}
				legend='Введите номер поставки из WB'
				required
				autoFocus
			/>

			<div className='form-actions'>
				<button type='submit' className='btn btn-w' disabled={loading}>
					<span className='btn-label'>
						{loading ? 'Сохраняю...' : 'Сохранить'}
					</span>
				</button>
			</div>
		</form>
	);
}
