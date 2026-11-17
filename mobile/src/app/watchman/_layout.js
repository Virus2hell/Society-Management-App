// Bottom tabs for the watchman / security guard.
import RoleTabs from '../../components/RoleTabs';

export default function WatchmanLayout() {
  return (
    <RoleTabs
      role="watchman"
      tabs={[
        { name: 'index', title: 'Gate', icon: 'enter-outline', headerTitle: 'Gate entry' },
        { name: 'scan', title: 'Scan pass', icon: 'qr-code-outline', headerTitle: 'Scan gate pass' },
        { name: 'log', title: 'Log', icon: 'list-outline', headerTitle: 'Visitor log' },
        { name: 'notices', title: 'Notices', icon: 'megaphone-outline', headerTitle: 'Notice board' },
      ]}
    />
  );
}
