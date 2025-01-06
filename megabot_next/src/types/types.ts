export interface Seller {
	seller_id: string;
	seller_name: string;
	supplies?: Supply[];
}

export interface Supply {
	_id?: string;
	task_id: string;
	preorder_id: string;
	warehouse_name?: string;
	warehouse_id?: string;
	seller_id?: string;
	seller_name?: string;
	booking_settings: {
		mode: string;
		target_dates: string[];
		priority: string;
		target_coeff: string;
	};
	status: {
		active: boolean;
		attempts_count: number;
		booked: boolean;
		supply_id: string | null;
	};
}

export interface User {
	_id: string;
	email: string;
	validated: boolean;
	user_type: string;
	notification_enabled: boolean;
	notification_settings: {
		// добавьте нужные поля
	};
	total_supplies_booked: number;
	active: boolean;
	active_till: Date;
	sellers?: Seller[];
}

export interface SupplyFormProps {
	initialData?: Supply;
	sellerId: string;
	onSuccess: (supply: Supply) => void;
	onError: (error: string) => void;
	apiEndpoint: string;
}

export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	legend?: string;
}

export interface InnInputProps extends Omit<InputProps, 'onChange'> {
	onChange: (value: string) => void;
}

export interface SellerFormProps {
	initialData?: Seller;
	onSubmit: (seller: Seller) => Promise<void>;
	loading?: boolean;
}

export interface SupplyCardProps {
	supply: Supply;
	onEdit: () => void;
	onDelete: () => void;
	sellerName?: string;
}

export interface SelectProps
	extends React.SelectHTMLAttributes<HTMLSelectElement> {
	legend?: string;
	options: Array<{
		value: string;
		label: string;
	}>;
}
