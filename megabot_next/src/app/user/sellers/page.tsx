'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useUser } from '@/lib/UserProvider';
import SellerCard from '@/components/layout/SellerCard';
import { Seller } from '@/types/types';
import Modal from '@/components/system/Modal';
import SellerForm from '@/components/forms/SellerForm';
import Thing from '@/components/layout/Thing';
import Link from 'next/link';
import { useToast } from '@/lib/ToastProvider';
import LoadingPage from '@/components/layout/LoadingPage';

export default function SellersPage() {
	const { sellers, dataLoading, refreshSellers } = useUser();
	const { showSuccess, showError } = useToast();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

	// Управление модальными окнами
	const handleOpenCreateModal = () => {
		setIsCreateModalOpen(true);
	};

	const handleOpenEditModal = (seller: Seller) => {
		setEditingSeller(seller);
		setIsEditModalOpen(true);
	};

	// Управление удалением
	const handleDeleteClick = (seller: Seller) => {
		setSellerToDelete(seller);
		setIsDeleteModalOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!sellerToDelete) return;
		setDeleteLoading(true);

		try {
			const response = await fetch(
				`/api/seller?id=${sellerToDelete.seller_id}`,
				{
					method: 'DELETE',
				}
			);

			if (!response.ok) {
				throw new Error('Ошибка при удалении магазина');
			}

			await refreshSellers();
			showSuccess('Магазин успешно удален');
		} catch (err) {
			showError(
				err instanceof Error ? err.message : 'Ошибка при удалении магазина'
			);
		} finally {
			setDeleteLoading(false);
			setIsDeleteModalOpen(false);
		}
	};

	// Показываем LoadingPage пока идет загрузка данных
	if (dataLoading) {
		return <LoadingPage />;
	}

	return (
		<>
			<div className='sticker'>
				<h2 className='sticker-header'>Твои магазины</h2>
				<button onClick={handleOpenCreateModal} className='btn btn-g'>
					<span className='btn-label'>Добавить магазин</span>
				</button>
			</div>

			<div className='content-container'>
				{sellers.length === 0 ? (
					<>
						<Thing emoji='👆'>
							Сначала добавь магазин. Вот кнопка зелёная.
						</Thing>
						<Thing emoji='📦'>
							Потом сможешь добавлять поставки, которые я буду
							бронировать.
						</Thing>
						<Thing emoji='⚠️'>
							Внимательно указывай ИНН продавца. Если неправильно укажешь
							ИНН, то я не смогу работать.
						</Thing>
						<Thing emoji='👉'>
							ИНН продавца ты можешь скопировать из кабинета WB.{' '}
							<a
								href='https://seller.wildberries.ru/supplier-settings/supplier-card'
								target='_blank'
								className='link'>
								Вот ссылка, нажимай сюда.
							</a>
						</Thing>
					</>
				) : (
					<>
						<Thing emoji='👌'>
							Отлично, магазин ты добавил. Теперь можно добавлять
							поставки,{' '}
							<Link href='/user/supplies' className='link'>
								просто кликай сюда.
							</Link>
						</Thing>
						<div className='cards'>
							{sellers.map((seller) => (
								<SellerCard
									key={seller.seller_id}
									name={seller.seller_name}
									inn={seller.seller_id}
									onEdit={() => handleOpenEditModal(seller)}
									onDelete={() => handleDeleteClick(seller)}
								/>
							))}
						</div>
					</>
				)}
			</div>

			{/* Модальное окно создания */}
			<Modal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				title='Добавить магазин'
				className='card-g'>
				{({ handleClose }) => (
					<SellerForm
						existingSellers={sellers}
						onSuccess={async () => {
							await refreshSellers();
							handleClose();
							showSuccess('Магазин успешно добавлен');
						}}
						onError={showError}
						apiEndpoint='/api/seller'
					/>
				)}
			</Modal>

			{/* Модальное окно редактирования */}
			<Modal
				isOpen={isEditModalOpen}
				onClose={() => setIsEditModalOpen(false)}
				title='Редактировать магазин'
				className='card-o'>
				{({ handleClose }) =>
					editingSeller && (
						<SellerForm
							initialData={editingSeller}
							existingSellers={sellers}
							onSuccess={async () => {
								await refreshSellers();
								handleClose();
								showSuccess('Магазин успешно обновлен');
							}}
							onError={showError}
							apiEndpoint='/api/seller'
						/>
					)
				}
			</Modal>

			{/* Модальное окно удаления */}
			<Modal
				isOpen={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				title='Ты точно хочешь удалить этот магазин?'
				className='card-r'>
				{({ handleClose }) => (
					<>
						<div className='seller-info'>
							<h3 className='seller-name'>
								{sellerToDelete?.seller_name}
							</h3>
							<p className='seller-inn'>
								ИНН {sellerToDelete?.seller_id}
							</p>
						</div>
						<div className='modal-actions'>
							<button
								onClick={async () => {
									await handleConfirmDelete();
									handleClose();
								}}
								className='btn btn-w'
								disabled={deleteLoading}>
								<span className='btn-label'>
									{deleteLoading ? 'Удаляю...' : 'Удалить'}
								</span>
							</button>
						</div>
					</>
				)}
			</Modal>
		</>
	);
}
