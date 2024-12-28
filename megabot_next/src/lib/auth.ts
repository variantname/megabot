import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/utils/db/db';
import User from '@/utils/db/models/User';
import { AuthOptions } from 'next-auth';

export const authOptions: AuthOptions = {
	providers: [
		CredentialsProvider({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials) {
				try {
					if (!credentials?.email || !credentials?.password) {
						throw new Error('Пожалуйста, введите email и пароль');
					}

					await dbConnect();

					const user = await User.findOne({ email: credentials.email });
					if (!user) {
						throw new Error('CredentialsSignin');
					}

					const isPasswordMatch = await bcrypt.compare(
						credentials.password,
						user.password
					);
					if (!isPasswordMatch) {
						throw new Error('CredentialsSignin');
					}

					await User.findByIdAndUpdate(user._id, {
						last_login: new Date(),
					});

					return {
						id: user._id.toString(),
						email: user.email,
						user_type: user.user_type,
					};
				} catch (error) {
					console.error('Auth error:', error);
					throw error;
				}
			},
		}),
	],
	session: {
		strategy: 'jwt',
	},
	pages: {
		signIn: '/login',
	},
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.user_type = user.user_type;
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user && token) {
				session.user.id = token.sub as string;
				session.user.user_type = token.user_type as string;
			}
			return session;
		},
	},
};
