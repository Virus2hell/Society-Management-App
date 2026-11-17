// Bottom tabs for the society secretary (admin).
import RoleTabs from '../../components/RoleTabs';

export default function SecretaryLayout() {
  return (
    <RoleTabs
      role="secretary"
      tabs={[
        { name: 'index', title: 'Dashboard', icon: 'grid-outline' },
        { name: 'dues', title: 'Dues', icon: 'wallet-outline', headerTitle: 'Maintenance collection' },
        { name: 'complaints', title: 'Complaints', icon: 'construct-outline' },
        { name: 'notices', title: 'Notices', icon: 'megaphone-outline', headerTitle: 'Notice board' },
        { name: 'members', title: 'Members', icon: 'people-outline' },
      ]}
    />
  );
}
