import { SupplyCardProps } from '@/types/types';

export default function SupplyCard({
	supply,
	onEdit,
	onDelete,
	sellerName,
}: SupplyCardProps) {
	const handleEdit = () => {
		if (!supply._id || !supply.seller_id) {
			console.error('Missing required IDs:', supply);
			return;
		}
		onEdit();
	};

	return (
		<div className='card'>
			<div className='card-header'>
				<h3>{supply.preorder_id}</h3>
				{sellerName && <div className='seller-name'>{sellerName}</div>}
			</div>

			<div className='supply-actions'>
				<button onClick={handleEdit} className='btn btn-o'>
					<span className='btn-label'>Изменить</span>
				</button>
				<button onClick={onDelete} className='btn btn-r'>
					<span className='btn-label'>Удалить</span>
				</button>
			</div>
		</div>
	);
}
