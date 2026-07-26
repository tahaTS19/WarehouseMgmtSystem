import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import PasswordInput from '../../components/common/PasswordInput';
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
        <div className={styles.field}>
          <label htmlFor="companyName" className={styles.label}>
            Company name
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            className={`${styles.input} ${errors.companyName ? styles.inputError : ''}`}
            value={formData.companyName}
            onChange={handleChange}
          />
          {errors.companyName && <span className={styles.error}>{errors.companyName}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="adminName" className={styles.label}>
            Your name
          </label>
          <input
            id="adminName"
            name="adminName"
            type="text"
            className={`${styles.input} ${errors.adminName ? styles.inputError : ''}`}
            value={formData.adminName}
            onChange={handleChange}
          />
          {errors.adminName && <span className={styles.error}>{errors.adminName}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && <span className={styles.error}>{errors.email}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            className={`${styles.input} ${styles.passwordInput} ${errors.password ? styles.inputError : ''}`}
            value={formData.password}
            onChange={handleChange}
          />
          {errors.password && <span className={styles.error}>{errors.password}</span>}
        </div>

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
