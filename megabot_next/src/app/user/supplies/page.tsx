'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/lib/UserProvider';
import { useToast } from '@/lib/ToastProvider';
import { Supply } from '@/types/types';
import Thing from '@/components/layout/Thing';
import Modal from '@/components/system/Modal';
import SupplyForm from '@/components/forms/SupplyForm';
import SupplyCard from '@/components/layout/SupplyCard';
import LoadingPage from '@/components/layout/LoadingPage';
import Select from '@/components/forms/Select';
import Link from 'next/link';

export default function SuppliesPage() {
	const {
		sellers,
		supplies,
		setSupplies,
		selectedSellerId,
		setSelectedSellerId,
		dataLoading,
	} = useUser();
	const { showSuccess, showError } = useToast();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [supplyToDelete, setSupplyToDelete] = useState<Supply | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

	// Управление удалением
	const handleDeleteClick = (supply: Supply) => {
		setSupplyToDelete(supply);
		setIsDeleteModalOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!supplyToDelete) return;
		setDeleteLoading(true);

		try {
			const response = await fetch(
				`/api/supply?id=${supplyToDelete._id}&seller_id=${supplyToDelete.seller_id}`,
				{
					method: 'DELETE',
				}
			);

			if (!response.ok) {
				throw new Error('Ошибка при удалении поставки');
			}

			setSupplies((prev) =>
				prev.filter((s) => s._id !== supplyToDelete._id)
			);
			showSuccess('Поставка успешно удалена');
		} catch (err) {
			showError(
				err instanceof Error ? err.message : 'Ошибка при удалении поставки'
			);
		} finally {
			setDeleteLoading(false);
			setIsDeleteModalOpen(false);
		}
	};

	// Показываем LoadingPage только при первичной загрузке
	if (dataLoading) {
		return <LoadingPage />;
	}

	return (
		<>
			{!sellers || sellers.length === 0 ? (
				<Thing emoji='🏪'>
					Сначала добавь магазин,{' '}
					<Link href='/user/sellers' className='link'>
						нажми на эту ссылку
					</Link>
				</Thing>
			) : (
				<>
					<div className='sticker'>
						{/* <h2 className='sticker-header'>Поставки магазина</h2> */}
						<Select
							id='seller-select'
							value={selectedSellerId}
							onChange={(e) => setSelectedSellerId(e.target.value)}
							options={[
								{ value: 'all', label: 'Все магазины' },
								...sellers.map((seller) => ({
									value: seller.seller_id,
									label: seller.seller_name,
								})),
							]}
						/>
						{selectedSellerId !== 'all' && (
							<button
								onClick={() => setIsCreateModalOpen(true)}
								className='btn btn-g'>
								<span className='btn-label'>Добавить поставку</span>
							</button>
						)}
					</div>

					<div className='content-container'>
						{selectedSellerId === 'all' && (
							<Thing emoji='👆'>
								Чтобы добавить поставку, выбери конкретный, нужный тебе
								магазин.
							</Thing>
						)}

						{supplies.length === 0 ? (
							<>
								<Thing emoji='👆'>
									Добавь первую поставку. Нажми на зелёную кнопку.
								</Thing>
								<Thing emoji='⚡'>
									Я буду автоматически бронировать слоты для твоих
									поставок.
								</Thing>
								<Thing emoji='⏰'>
									Проверяю наличие слотов каждые 5 секунд.
								</Thing>
							</>
						) : (
							<div className='cards'>
								{supplies.map((supply) => (
									<SupplyCard
										key={supply._id}
										supply={supply}
										onEdit={() => {
											setEditingSupply(supply);
											setIsEditModalOpen(true);
										}}
										onDelete={() => handleDeleteClick(supply)}
										sellerName={
											selectedSellerId === 'all'
												? supply.seller_name
												: sellers.find(
														(s) =>
															s.seller_id === selectedSellerId
												  )?.seller_name
										}
									/>
								))}
							</div>
						)}
					</div>

					{/* Модальное окно создания */}
					<Modal
						isOpen={isCreateModalOpen}
						onClose={() => setIsCreateModalOpen(false)}
						title={`Добавить поставку для магазина "${
							sellers?.find((s) => s.seller_id === selectedSellerId)
								?.seller_name
						}"`}
						className='card-g'>
						{({ handleClose }) => (
							<SupplyForm
								sellerId={selectedSellerId || ''}
								apiEndpoint='/api/supply'
								onSuccess={(newSupply: Supply) => {
									setSupplies((prev) => [
										...prev,
										{
											...newSupply,
											_id: newSupply._id,
											seller_id: selectedSellerId,
											seller_name:
												sellers?.find(
													(s) => s.seller_id === selectedSellerId
												)?.seller_name || '',
										},
									]);
									handleClose();
									showSuccess('Поставка успешно создана');
								}}
								onError={(error: string) => {
									showError(error || 'Ошибка при создании поставки');
								}}
							/>
						)}
					</Modal>

					{/* Модальное окно редактирования */}
					<Modal
						isOpen={isEditModalOpen}
						onClose={() => setIsEditModalOpen(false)}
						title='Редактировать поставку'
						className='card-o'>
						{({ handleClose }) =>
							editingSupply && (
								<SupplyForm
									initialData={editingSupply}
									sellerId={editingSupply.seller_id || ''}
									apiEndpoint='/api/supply'
									onSuccess={(updatedSupply: Supply) => {
										setSupplies((prev) =>
											prev.map((s) =>
												s._id === editingSupply?._id
													? {
															...updatedSupply,
															_id: editingSupply._id,
															seller_id: editingSupply.seller_id,
															seller_name:
																editingSupply.seller_name,
													  }
													: s
											)
										);
										handleClose();
										showSuccess('Поставка успешно обновлена');
									}}
									onError={(error: string) => {
										showError(
											error || 'Ошибка при обновлении поставки'
										);
									}}
								/>
							)
						}
					</Modal>

					{/* Модальное окно удаления */}
					<Modal
						isOpen={isDeleteModalOpen}
						onClose={() => setIsDeleteModalOpen(false)}
						title='Удалить поставку?'
						className='card-r'>
						{({ handleClose }) => (
							<>
								<div className='supply-info'>
									<h3 className='supply-name'>
										Поставка {supplyToDelete?.preorder_id}
									</h3>
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
			)}
		</>
	);
}
