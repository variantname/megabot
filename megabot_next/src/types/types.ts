export interface Seller {
	seller_id: string;
	seller_name: string;
}

export interface Supply {
	_id?: string;
	user_id: string;
	task_id: string;
	seller_id: string;
	preorder_id: string;
	warehouse_name?: string;
	warehouse_id?: string;
	booking_settings: {
		mode: string | null;
		target_dates: string[];
		priority: string | null;
		target_coeff: string;
	};
	status: {
		active: boolean;
		attempts_count: number;
		booked: boolean;
		supply_id: string | null;
	};
}

export interface SupplyFormProps {
	initialData?: Supply;
	onSuccess: (supply: Supply) => void;
	onError: (error: string) => void;
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
