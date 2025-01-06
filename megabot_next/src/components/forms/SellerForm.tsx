import { useState } from 'react';
import { Seller } from '@/types/types';
import Input from '@/components/forms/Input';
import InnInput from '@/components/forms/InnInput';

interface SellerFormProps {
	initialData?: Seller;
	existingSellers: Seller[];
	onSuccess: (seller: Seller) => void;
	onError: (error: string) => void;
	apiEndpoint: string;
}

export default function SellerForm({
	initialData,
	existingSellers,
	onSuccess,
	onError,
	apiEndpoint,
}: SellerFormProps) {
	const [seller, setSeller] = useState<Seller>(
		initialData || {
			seller_id: '',
			seller_name: '',
		}
	);
	const [loading, setLoading] = useState(false);

	// Валидация внутри компонента
	const validateSeller = (
		data: Seller
	): { isValid: boolean; error?: string } => {
		if (!data.seller_name.trim()) {
			return { isValid: false, error: 'Ты забыл указать название магазина' };
		}
		if (data.seller_name.length < 3) {
			return {
				isValid: false,
				error: 'Название магазина должно содержать минимум 3 символа',
			};
		}
		if (data.seller_name.length > 33) {
			return {
				isValid: false,
				error: 'Название магазина не должно превышать 33 символа',
			};
		}

		// Проверка на дубликат названия
		const duplicateName = existingSellers.find(
			(s) =>
				s.seller_name.toLowerCase() === data.seller_name.toLowerCase() &&
				(!initialData || s.seller_id !== initialData.seller_id)
		);

		if (duplicateName) {
			return {
				isValid: false,
				error: `У тебя уже есть магазин с названием "${data.seller_name}"`,
			};
		}

		if (!/^\d{10}$|^\d{12}$/.test(data.seller_id)) {
			return {
				isValid: false,
				error: 'ИНН должен содержать 10 или 12 цифр',
			};
		}

		// Проверка на дубликат ИНН
		const duplicateSeller = existingSellers.find(
			(s) =>
				s.seller_id === data.seller_id &&
				(!initialData || s.seller_id !== initialData.seller_id)
		);

		if (duplicateSeller) {
			return {
				isValid: false,
				error: `У тебя уже есть магазин с ИНН ${data.seller_id}, его название (${duplicateSeller.seller_name})`,
			};
		}

		return { isValid: true };
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const validation = validateSeller(seller);

			if (!validation.isValid) {
				onError(validation.error || 'Ошибка валидации');
				return;
			}

			const method = initialData ? 'PUT' : 'POST';
			const url = initialData
				? `${apiEndpoint}?id=${initialData.seller_id}`
				: apiEndpoint;

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(seller),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Ошибка при сохранении');
			}

			const data = await response.json();
			onSuccess(data.seller);
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
				id='seller_name'
				name='seller_name'
				value={seller.seller_name}
				onChange={(e) =>
					setSeller((prev) => ({
						...prev,
						seller_name: e.target.value.slice(0, 33),
					}))
				}
				placeholder='Название магазина'
				disabled={loading}
				legend='От 3 до 33 символов'
				autoFocus
				maxLength={33}
			/>

			<div>
				<InnInput
					id='seller_id'
					name='seller_id'
					value={seller.seller_id}
					onChange={(value) =>
						setSeller((prev) => ({ ...prev, seller_id: value }))
					}
					placeholder='ИНН продавца на WB'
					disabled={loading}
				/>
			</div>

			<div className='seller-actions'>
				<button type='submit' className='btn btn-w' disabled={loading}>
					<span className='btn-label'>
						{loading ? 'Сохраняю...' : 'Сохранить'}
					</span>
				</button>
			</div>
		</form>
	);
}
