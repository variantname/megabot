import { InputProps } from '@/types/types';

export default function Input({ legend, id, name, ...props }: InputProps) {
	const inputId = id || name || '';

	return (
		<div className='form-control'>
			<input className='input' id={inputId} name={name} {...props} />
			{legend && <div className='input-legend'>{legend}</div>}
		</div>
	);
}
