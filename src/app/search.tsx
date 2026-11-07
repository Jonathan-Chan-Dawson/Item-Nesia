import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { searchItems } from '../utils/memory';
import { useMemory } from '../hooks/useMemory';
import { Button, Copy, Empty, Field, Header, Screen } from '../components/ui';
import { ItemCard } from '../components/ItemCard';

export default function Search() {
  const { data } = useMemory();
  const [query, setQuery] = useState('');
  const items = searchItems(data.items, data.places, query);
  return (
    <Screen scroll={false}>
      <Header title="Find a memory" />
      <Field
        label="Search items and places"
        placeholder="Where did I put my…?"
        value={query}
        onChangeText={setQuery}
        autoFocus
        returnKeyType="search"
        autoCorrect={false}
      />
      <Button
        secondary
        title="Clear search"
        disabled={!query}
        onPress={() => setQuery('')}
      />
      <Copy muted>
        {items.length} {items.length === 1 ? 'result' : 'results'} · saved on
        this device
      </Copy>
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <ItemCard item={item} list />
          </View>
        )}
        ListEmptyComponent={
          <Empty
            title="Couldn’t find that one."
            message="Try another word or save it if you haven’t yet."
            action="Remember an Item"
            onPress={() => router.push('/capture')}
          />
        }
      />
    </Screen>
  );
}
