import React from 'react';
import styles from './Legal.module.css';

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last Updated: March 19, 2026</p>
        
        <section className={styles.section}>
          <h2>1. Information We Collect</h2>
          <p>We collect your email, profile information, and activity data to optimize your productivity via our Zenith AI features.</p>
        </section>

        <section className={styles.section}>
          <h2>2. How We Use Data</h2>
          <p>Data is used exclusively for providing personal insights, task management, and habit tracking. We do not sell your personal data to third parties.</p>
        </section>

        <section className={styles.section}>
          <h2>3. AI Processing</h2>
          <p>Our AI Assistant processes your task and focus data locally or via secure inference to provide real-time strategic recommendations.</p>
        </section>

        <section className={styles.section}>
          <h2>4. Security</h2>
          <p>We employ industry-standard security measures, including Clerk for authentication and Supabase for secure data storage.</p>
        </section>

        <section className={styles.section}>
          <h2>5. Contact</h2>
          <p>For any privacy-related inquiries, please contact us through the Command Center settings.</p>
        </section>
      </div>
    </div>
  );
}
