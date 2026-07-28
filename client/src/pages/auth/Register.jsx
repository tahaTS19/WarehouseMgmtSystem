import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import FormField from '../../components/common/FormField';
import { useAuth } from '../../context/AuthContext';
import styles from './AuthForm.module.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    adminName: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const nextErrors = {};
    if (!formData.companyName) nextErrors.companyName = 'Company name is required';
    if (!formData.adminName) nextErrors.adminName = 'Your name is required';
    if (!formData.email) nextErrors.email = 'Email is required';
    if (!formData.password) {
      nextErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register(formData);
      toast.success('Company registered');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Register your company"
      subtitle="This creates your company and your admin account together."
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <FormField
          id="companyName"
          name="companyName"
          label="Company name"
          value={formData.companyName}
          onChange={handleChange}
          error={errors.companyName}
        />

        <FormField
          id="adminName"
          name="adminName"
          label="Your name"
          value={formData.adminName}
          onChange={handleChange}
          error={errors.adminName}
        />

        <FormField
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
        />

        <FormField
          id="password"
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />

        <button type="submit" className={styles.submit} disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create company account'}
        </button>
      </form>

      <p className={styles.switchLine}>
        Already have an account?{' '}
        <Link to="/login" className={styles.switchLink}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
