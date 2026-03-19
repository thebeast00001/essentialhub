import React from 'react';
import styles from './Legal.module.css';

export default function TermsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last Updated: March 19, 2026</p>
        
        <section className={styles.section}>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using Zenith Productivity (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.</p>
        </section>

        <section className={styles.section}>
          <h2>2. Description of Service</h2>
          <p>Zenith Productivity is an AI-enhanced productivity command center designed to optimize focus, task management, and personal growth.</p>
        </section>

        <section className={styles.section}>
          <h2>3. User Responsibilities</h2>
          <p>You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.</p>
        </section>

        <section className={styles.section}>
          <h2>4. Data Ownership</h2>
          <p>You retain all rights to the data you enter into the Service. We process your data to provide AI insights and productivity tracking features.</p>
        </section>

        <section className={styles.section}>
          <h2>5. Limitation of Liability</h2>
          <p>The Service is provided "as is". We are not liable for any productivity loss or data issues arising from the use of the Service.</p>
        </section>
      </div>
    </div>
  );
}
