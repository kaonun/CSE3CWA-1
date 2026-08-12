"use client";

import Link from "next/link";
import styles from "./HamburgerMenu.module.css";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
];

export default function HamburgerMenu({ id, open, onClose }) {
  return (
    <div id={id} className={styles.menu} hidden={!open}>
      <ul className={styles.list}>
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={styles.link} onClick={onClose}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
