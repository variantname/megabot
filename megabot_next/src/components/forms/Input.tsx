import { InputProps } from '@/types/types';

export default function Input({ legend, ...props }: InputProps) {
	return (
		<div className='form-control'>
			<input className='input' {...props} />
			{legend && <div className='input-legend'>{legend}</div>}
		</div>
	);
}
