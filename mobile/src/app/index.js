// First screen: decides where to go.
//   not logged in               -> /login
//   inside a society            -> /resident, /watchman or /secretary (your role there)
//   no society / several / pending -> /societies (create, join or choose)
import { Redirect } from 'expo-router';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { user, activeMembership, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Redirect href="/login" />;
  if (activeMembership) return <Redirect href={`/${activeMembership.role}`} />;
  return <Redirect href="/societies" />;
}
