import { Tabs } from 'expo-router/js-tabs';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarIconStyle: { display: 'none' }, tabBarLabelStyle: { fontSize: 15 } }}>
      <Tabs.Screen name="index" options={{ title: 'Головна' }} />
    </Tabs>
  );
}
