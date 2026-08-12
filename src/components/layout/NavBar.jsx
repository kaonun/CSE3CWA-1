"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HamburgerMenu from "./HamburgerMenu";
import styles from "./NavBar.module.css";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/wordle", label: "Wordle" },
  { href: "/wordsearch", label: "Word Search" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  const closeMenu = () => {
    setMenuOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <nav className={styles.nav} aria-label="Primary">
      <ul className={styles.tabs}>
        {TABS.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              className={styles.tab}
              aria-current={pathname === tab.href ? "page" : undefined}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>

      <button
        ref={triggerRef}
        type="button"
        className={styles.hamburgerTrigger}
        aria-expanded={menuOpen}
        aria-controls="hamburger-menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className={styles.hamburgerIcon} aria-hidden="true" />
        Menu
      </button>

      <HamburgerMenu id="hamburger-menu" open={menuOpen} onClose={closeMenu} />
    </nav>
  );
}
