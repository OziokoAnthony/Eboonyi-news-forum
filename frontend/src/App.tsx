import { useEffect, useState } from 'react';
import HomePage from './HomePage';
import AdminPage from './AdminPage';
import PrivacyPage from './PrivacyPage';

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash.startsWith('#/admin') ? <AdminPage /> : hash.startsWith('#/privacy') ? <PrivacyPage /> : <HomePage />;
}
