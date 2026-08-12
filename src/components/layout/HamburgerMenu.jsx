"use client";

import Link from "next/link";
import { NAV_LINKS } from "./navigationLinks";
import styles from "./HamburgerMenu.module.css";

export default function HamburgerMenu({ id, open, pathname, onClose }) {
  return (
    <div id={id} className={styles.menu} hidden={!open}>
      <ul className={styles.list}>
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={styles.link}
              aria-current={pathname === link.href ? "page" : undefined}
              onClick={onClose}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
