import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './PasswordInput.module.css';

// A drop-in replacement for a plain <input type="password">. The parent still
// owns the field wrapper/label/error styling — this component only owns the
// input itself and the show/hide toggle button layered on top of it.
export default function PasswordInput({ id, name, value, onChange, autoComplete, className }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={styles.wrap}>
      <input
        id={id}
        name={name}
        type={isVisible ? 'text' : 'password'}
        autoComplete={autoComplete}
        className={className}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setIsVisible((prev) => !prev)}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
      >
        {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
