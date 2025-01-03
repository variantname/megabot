'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/ToastProvider';
import { Supply } from '@/types/types';
import Thing from '@/components/layout/Thing';
import Modal from '@/components/system/Modal';
import SupplyForm from '@/components/forms/SupplyForm';

export default function SuppliesPage() {
	const { data: session } = useSession();
	const { showSuccess, showError } = useToast();

	const [supplies, setSupplies] = useState<Supply[]>([]);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingSupply, setEditingSupply] = useState<Supply | null>(null);

	// Загрузка поставок
	useEffect(() => {
		const fetchSupplies = async () => {
			try {
				const response = await fetch('/api/user/data');
				const data = await response.json();
				if (data.user?.supplies) {
					setSupplies(data.user.supplies);
				}
			} catch (error) {
				console.error('Error fetching supplies:', error);
				showError('Ошибка при загрузке поставок');
			}
		};

		if (session) {
			fetchSupplies();
		}
	}, [session]);

	return (
		<>
			<div className='sticker'>
				<h2 className='sticker-header'>Твои поставки</h2>
				<button
					onClick={() => setIsCreateModalOpen(true)}
					className='btn btn-g'>
					<span className='btn-label'>Добавить поставку</span>
				</button>
			</div>

			<div className='content-container'>
				{supplies.length === 0 ? (
					<>
						<Thing emoji='👆'>
							Добавь первую поставку. Нажми на зелёную кнопку.
						</Thing>
						<Thing emoji='⚡'>
							Я буду автоматически бронировать слоты для твоих поставок.
						</Thing>
						<Thing emoji='⏰'>
							Проверяю наличие слотов каждые 5 секунд.
						</Thing>
					</>
				) : (
					<div className='cards'>
						{supplies.map((supply) => (
							<div key={supply._id} className='supply-card'>
								{/* Временная карточка, пока не создадим SupplyCard */}
								<h3>Поставка {supply.preorder_id}</h3>
								<button
									onClick={() => {
										setEditingSupply(supply);
										setIsEditModalOpen(true);
									}}
									className='btn btn-o'>
									Редактировать
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Модальное окно создания поставки */}
			<Modal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				title='Добавить поставку'
				className='card-g'>
				{({ handleClose }) => (
					<SupplyForm
						onSuccess={(newSupply) => {
							setSupplies((prev) => [...prev, newSupply]);
							handleClose();
							showSuccess('Поставка успешно создана');
						}}
						onError={(error) => {
							showError(error || 'Ошибка при создании поставки');
						}}
					/>
				)}
			</Modal>

			{/* Модальное окно редактирования поставки */}
			<Modal
				isOpen={isEditModalOpen}
				onClose={() => setIsEditModalOpen(false)}
				title='Редактировать поставку'
				className='card-o'>
				{({ handleClose }) =>
					editingSupply && (
						<SupplyForm
							initialData={editingSupply}
							onSuccess={(updatedSupply) => {
								setSupplies((prev) =>
									prev.map((s) =>
										s._id === editingSupply._id ? updatedSupply : s
									)
								);
								handleClose();
								showSuccess('Поставка успешно обновлена');
							}}
							onError={(error) => {
								showError(error || 'Ошибка при обновлении поставки');
							}}
						/>
					)
				}
			</Modal>
		</>
	);
}
