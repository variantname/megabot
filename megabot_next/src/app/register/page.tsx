'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function RegisterPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		try {
			// Проверяем формат email
			const emailRegex =
				/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]{2,99}$/;
			if (!emailRegex.test(email)) {
				throw new Error('Пожалуйста, введите корректный email адрес');
			}

			// Проверяем совпадение паролей
			if (password !== confirmPassword) {
				throw new Error('Пароли не совпадают');
			}

			// Проверяем минимальную длину пароля
			if (password.length < 6) {
				throw new Error('Пароль должен быть не менее 6 символов');
			}

			// 1. Регистрируем пользователя
			const registerRes = await fetch('/api/auth/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email,
					password,
				}),
			});

			const data = await registerRes.json();

			if (!registerRes.ok) {
				throw new Error(data.error || 'Ошибка при регистрации');
			}

			// 2. Автоматически логиним пользователя
			const signInRes = await signIn('credentials', {
				email,
				password,
				redirect: false,
			});

			if (signInRes?.error) {
				throw new Error(signInRes.error);
			}

			// 3. Редиректим на страницу завершения регистрации
			router.push('/user/sellers');
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

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

								<div className='form-control w-full my-3'>
									<label className='label'>
										<span className='label-text'>
											Подтвердите пароль
										</span>
									</label>
									<input
										name='confirmPassword'
										type='password'
										placeholder='••••••••'
										className='input input-bordered w-full'
										required
									/>
								</div>

								<button
									className='btn btn-primary w-full mt-6'
									disabled={loading}>
									{loading ? 'Регистрация...' : 'Зарегистрироваться'}
								</button>

								<div className='text-center'>
									<div className='text-lg my-3'>Уже есть аккаунт?</div>
									<Link
										href='/login'
										className='btn btn-secondary w-full'>
										Войти
									</Link>
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
