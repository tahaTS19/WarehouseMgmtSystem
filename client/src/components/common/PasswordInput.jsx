import { useState } from "react";
import styles from "./PasswordInput.module.css";

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// A drop-in replacement for a plain <input type="password">. The parent still
// owns the field wrapper/label/error styling — this component only owns the
// input itself and the show/hide toggle button layered on top of it.
export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  autoComplete,
  className,
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={styles.wrap}>
      <input
        id={id}
        name={name}
        type={isVisible ? "text" : "password"}
        autoComplete={autoComplete}
        className={className}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setIsVisible((prev) => !prev)}
        aria-label={isVisible ? "Hide password" : "Show password"}
      >
        {isVisible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
