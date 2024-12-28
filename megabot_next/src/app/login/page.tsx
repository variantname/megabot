'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/lib/UserProvider';
import LoadingPage from '@/components/layout/LoadingPage';

export default function LoginPage() {
	const { data: session, status } = useSession();
	const { hasInn, loading: userLoading } = useUser();
	const router = useRouter();
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	// Проверяем статус авторизации и ИНН
	useEffect(() => {
		if (status === 'authenticated' && !userLoading) {
			if (hasInn) {
				router.push('/user/supplies');
			} else {
				router.push('/user/sellers');
			}
		}
	}, [status, hasInn, userLoading, router]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		try {
			const result = await signIn('credentials', {
				email,
				password,
				redirect: false,
			});

			if (result?.error) {
				switch (result.error) {
					case 'CredentialsSignin':
						setError('Неверный email или пароль');
						break;
					default:
						setError('Произошла ошибка при входе');
				}
			}
			// Убираем редирект отсюда, он будет происходить через useEffect
		} catch (err) {
			console.error('Login error:', err);
			setError('Произошла ошибка при подключении к серверу');
		} finally {
			setLoading(false);
		}
	};

	// Показываем загрузку при любых проверках статуса
	if (
		status === 'loading' ||
		loading ||
		(status === 'authenticated' && userLoading)
	) {
		return <LoadingPage />;
	}

	// Показываем форму только если точно не авторизован
	if (status === 'unauthenticated') {
		return (
			<div className='content-container'>
				<div className='flex flex-col items-center justify-center'>
					<div className='flex justify-center'>
						<h2 className='card-hello'>
							<div className='hello-emoji'>❤️</div>
							<div className='hello-human'>
								Здравствуй, <br />
								прекрасный Человек
							</div>
						</h2>
					</div>

					<div className='card bg-base-200 shadow-xl card-login'>
						<div className='card-body'>
							{error && (
								<div className='alert alert-error mb-4'>{error}</div>
							)}

							<form onSubmit={handleSubmit}>
								<div className='form-control w-full'>
									<label className='label'>
										<span className='label-text'>Email</span>
									</label>
									<input
										name='email'
										type='email'
										placeholder='your@email.com'
										className='input input-bordered w-full'
										required
									/>
								</div>

								<div className='form-control w-full my-3'>
									<label className='label'>
										<span className='label-text'>Пароль</span>
									</label>
									<input
										name='password'
										type='password'
										placeholder='••••••••'
										className='input input-bordered w-full'
										required
									/>
								</div>

								<button
									className='btn btn-primary w-full mt-6'
									disabled={loading}>
									{loading ? 'Вхожу...' : 'Войти'}
								</button>

								<div className='text-center'>
									<div className='text-lg my-3'>или</div>
									<Link
										href='/register'
										className='btn btn-secondary w-full'>
										Зарегистрироваться
									</Link>
								</div>

								<div className='text-center'>
									<div className='text-lg my-3'>🤦 Ааа...!!!</div>
									<Link
										href='/forgot-password'
										className='btn btn-accent w-full'>
										Я забыл пароль...
									</Link>
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// В остальных случаях показываем загрузку
	return <LoadingPage />;
}
