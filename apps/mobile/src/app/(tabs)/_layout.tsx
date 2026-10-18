import { Tabs } from 'expo-router/js-tabs';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarIconStyle: { display: 'none' }, tabBarLabelStyle: { fontSize: 15 } }}>
      <Tabs.Screen name="index" options={{ title: 'Головна' }} />
      <Tabs.Screen name="library" options={{ title: 'Рецепти' }} />
      <Tabs.Screen name="import" options={{ title: 'Імпорт' }} />
      <Tabs.Screen name="profile" options={{ title: 'Профіль' }} />
    </Tabs>
  );
}
