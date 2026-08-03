import styles from './FormField.module.css';
import PasswordInput from './PasswordInput';

// Consolidates the label + input + error pattern that was previously
// duplicated across Login.jsx and Register.jsx (4-5 near-identical blocks in
// each). Handles both plain inputs and password inputs (via `type="password"`)
// through one component, since they only differ in whether a toggle button
// is layered on top.
export default function FormField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
}) {
  const inputClassName = `${styles.input} ${type === 'password' ? styles.passwordInput : ''} ${error ? styles.inputError : ''}`;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>

      {type === 'password' ? (
        <PasswordInput
          id={id}
          name={name}
          autoComplete={autoComplete}
          className={inputClassName}
          value={value}
          onChange={onChange}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          className={inputClassName}
          value={value}
          onChange={onChange}
        />
      )}

      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
