// Bottom-tab layout shared by the three roles. It also guards the section:
// - not logged in            -> /login
// - not inside a society     -> /societies (create / join / pick one)
// - wrong role for this tab  -> the right section for your role in this society
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import HeaderActions from './HeaderActions';
import HeaderTitle from './HeaderTitle';
import Loader from './Loader';

export default function RoleTabs({ role, tabs }) {
  const { user, activeMembership, loading } = useAuth();

  if (loading) return <Loader />;
  if (!user) return <Redirect href="/login" />;
  if (!activeMembership) return <Redirect href="/societies" />;
  if (activeMembership.role !== role) return <Redirect href={`/${activeMembership.role}`} />;

  return (
    <Tabs
      screenOptions={{
        headerRight: () => <HeaderActions />,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            headerTitle: () => <HeaderTitle title={tab.headerTitle || tab.title} subtitle={activeMembership.society?.name} />,
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
