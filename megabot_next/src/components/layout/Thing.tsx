interface ThingProps {
	emoji: string;
	children: React.ReactNode;
}

export default function Thing({ emoji, children }: ThingProps) {
	return (
		<div className='thing'>
			<span className='emoji c'>{emoji}</span>
			<span className='emoji-label'>{children}</span>
		</div>
	);
}
