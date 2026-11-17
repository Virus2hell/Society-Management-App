// Bottom tabs for residents.
import RoleTabs from '../../components/RoleTabs';

export default function ResidentLayout() {
  return (
    <RoleTabs
      role="resident"
      tabs={[
        { name: 'index', title: 'Home', icon: 'home-outline' },
        { name: 'visitors', title: 'Visitors', icon: 'people-outline' },
        { name: 'dues', title: 'Dues', icon: 'wallet-outline', headerTitle: 'Maintenance' },
        { name: 'complaints', title: 'Complaints', icon: 'construct-outline' },
        { name: 'notices', title: 'Notices', icon: 'megaphone-outline', headerTitle: 'Notice board' },
      ]}
    />
  );
}
