import { InnInputProps } from '@/types/types';
import Input from './Input';

export default function InnInput({ onChange, ...props }: InnInputProps) {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const numericValue = e.target.value.replace(/\D/g, '');
		onChange(numericValue.slice(0, 12));
	};

	return (
		<Input
			{...props}
			inputMode='numeric'
			pattern='\d*'
			onChange={handleChange}
			legend='Только цифры, 10 или 12 знаков'
		/>
	);
}
