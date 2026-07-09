export function FirebaseConfigScreen() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand">Streamline</div>
        <h1>Firebase configuration required</h1>
        <p>
          This app authenticates with Firebase only. Copy <code>.env.example</code> to{" "}
          <code>.env.local</code> and add your Firebase project credentials, then restart the dev
          server.
        </p>
        <div className="config-hint">
          <p>Required variables:</p>
          <ul>
            <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
            <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
            <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
            <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
            <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
            <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
