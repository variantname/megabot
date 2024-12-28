'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingPage from '@/components/layout/LoadingPage';
import SellerCard from '@/components/layout/SellerCard';
import { Seller } from '@/types/types';

export default function SellersPage() {
	const { data: session, status } = useSession();
	const router = useRouter();

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [sellers, setSellers] = useState<Seller[]>([]);
	const [newSeller, setNewSeller] = useState<Seller>({
		seller_id: '',
		seller_name: '',
	});
	const [pageReady, setPageReady] = useState(false);

	useEffect(() => {
		if (status === 'unauthenticated') {
			router.push('/login');
			return;
		}

		const fetchUserData = async () => {
			try {
				const response = await fetch('/api/user/data');
				const data = await response.json();

				console.log('Received user data:', {
					sellers: data.user?.sellers,
				});

				if (data.user?.sellers) {
					setSellers(data.user.sellers);
				}
			} catch (error) {
				console.error('Error fetching user data:', error);
			} finally {
				setPageReady(true);
			}
		};

		if (session) {
			fetchUserData();
		}
	}, [session, status, router]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		if (name === 'seller_id') {
			const numericValue = value.replace(/\D/g, '');
			setNewSeller((prev) => ({
				...prev,
				[name]: numericValue.slice(0, 12),
			}));
		} else {
			setNewSeller((prev) => ({
				...prev,
				[name]: value,
			}));
		}
	};

	const handleDelete = async (inn: string) => {
		if (window.confirm('Вы уверены, что хотите удалить этот магазин?')) {
			setLoading(true);
			try {
				const updatedSellers = sellers.filter((s) => s.seller_id !== inn);
				const response = await fetch('/api/user/update', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ sellers: updatedSellers }),
				});

				if (!response.ok) throw new Error('Ошибка при удалении магазина');

				setSellers(updatedSellers);
				setSuccess('Магазин успешно удален');
			} catch (err: any) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		}
	};

	const handleEdit = (seller: Seller) => {
		setNewSeller(seller);
	};

	const saveSeller = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setSuccess('');
		setLoading(true);

		try {
			if (!newSeller.seller_name.trim()) {
				throw new Error('Укажите название магазина');
			}
			if (newSeller.seller_name.length < 3) {
				throw new Error(
					'Название магазина должно содержать минимум 3 символа'
				);
			}
			if (!/^\d{10}$|^\d{12}$/.test(newSeller.seller_id)) {
				throw new Error('ИНН должен содержать 10 или 12 цифр');
			}

			const updatedSellers = [
				...sellers.filter((s) => s.seller_id !== newSeller.seller_id),
				newSeller,
			];

			const response = await fetch('/api/user/update', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sellers: updatedSellers }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Ошибка сохранения данных');
			}

			setSellers(updatedSellers);
			setSuccess('Магазин успешно сохранен!');
			setNewSeller({ seller_id: '', seller_name: '' });
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	if (!pageReady || status === 'loading' || loading) {
		return <LoadingPage />;
	}

	return (
		<>
			<div className='sticker'>
				<h1>Твои магазины</h1>
			</div>

			<div className='content-container'>
				{error && <div className='alert alert-error'>{error}</div>}
				{success && <div className='alert alert-success'>{success}</div>}

				<div className='cards'>
					{/* Список существующих магазинов */}
					{sellers.length > 0 && (
						<>
							{sellers.map((seller) => (
								<SellerCard
									key={seller.seller_id}
									name={seller.seller_name}
									inn={seller.seller_id}
									onEdit={() => handleEdit(seller)}
									onDelete={() => handleDelete(seller.seller_id)}
								/>
							))}
						</>
					)}

					{/* Форма добавления/редактирования */}
					<div className='card card-g'>
						<form onSubmit={saveSeller}>
							<div className='form-control'>
								<input
									type='text'
									name='seller_name'
									className='input'
									value={newSeller.seller_name}
									onChange={handleInputChange}
									placeholder='Тут название магазина'
									required
									disabled={loading}
									minLength={3}
									maxLength={33}
								/>
								<div className='input-legend'>От 3 до 33 символов</div>
							</div>

							<div className='form-control mt-4'>
								<input
									type='text'
									name='seller_id'
									inputMode='numeric'
									pattern='\d*'
									className='input'
									value={newSeller.seller_id}
									onChange={handleInputChange}
									placeholder='Тут ИНН продавца на WB'
									required
									disabled={loading}
								/>
								<div className='input-legend'>
									Только цифры, 10 или 12 знаков
								</div>
							</div>
							<div className='seller-actions'>
								<button
									type='submit'
									className='btn btn-w'
									disabled={
										loading ||
										!newSeller.seller_id ||
										!newSeller.seller_name
									}>
									<span className='btn-label'>
										{loading ? 'Сохраняю...' : 'Сохранить магазин'}
									</span>
								</button>
							</div>
						</form>
					</div>
				</div>

				<div className='mt-6 text-md text-center text-gray-600'>
					{sellers.length === 0 ? (
						<p>
							После добавления магазина откроется доступ к функциям бота.
						</p>
					) : (
						<p>
							Бот работает только с магазинами, ИНН которых соответствует
							кабинету продавца WB.
						</p>
					)}
				</div>
			</div>
		</>
	);
}
