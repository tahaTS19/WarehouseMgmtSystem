import styles from "./SearchBar.module.css";
import { Search } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}) {
  return (
    <div className={styles.searchBar}>
      <Search
        size={18}
        strokeWidth={2}
        className={styles.searchIcon}
      />

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        className={styles.searchInput}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}