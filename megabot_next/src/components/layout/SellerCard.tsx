interface SellerCardProps {
	name: string;
	inn: string;
	onEdit: () => void;
	onDelete: () => void;
}

export default function SellerCard({
	name,
	inn,
	onEdit,
	onDelete,
}: SellerCardProps) {
	return (
		<div className='card'>
			<div className='seller-info'>
				<h3 className='seller-name'>{name}</h3>
				<p className='seller-inn'>ИНН {inn}</p>
			</div>

			<div className='seller-actions'>
				<button onClick={onEdit} className='btn btn-o'>
					<span className='btn-label'>Изменить</span>
				</button>
				<button onClick={onDelete} className='btn btn-r'>
					<span className='btn-label'>Удалить</span>
				</button>
			</div>
		</div>
	);
}
