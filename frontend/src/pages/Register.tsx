import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        username: '',
        display_name: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await axios.post('http://localhost:3000/auth/register', formData);
            navigate('/login?registered=true');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-black font-bold text-2xl">X</span>
                    </div>
                    <h2 className="text-3xl font-bold">Create your account</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <input
                            type="text"
                            name="display_name"
                            required
                            value={formData.display_name}
                            onChange={handleChange}
                            placeholder="Display Name"
                            className="w-full bg-black border border-gray-700 rounded-md p-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <input
                            type="text"
                            name="username"
                            required
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Username"
                            className="w-full bg-black border border-gray-700 rounded-md p-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Email"
                            className="w-full bg-black border border-gray-700 rounded-md p-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Password"
                            className="w-full bg-black border border-gray-700 rounded-md p-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 flex justify-center"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Sign Up'}
                    </button>
                </form>

                <div className="text-center text-gray-500">
                    Have an account already?{' '}
                    <Link to="/login" className="text-primary hover:underline">
                        Log in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
