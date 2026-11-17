import { Copy, Header, Icon, Panel, Screen, Section } from '../components/ui';
export default function About() {
  return (
    <Screen>
      <Header title="Organize your items" />
      <Icon name="cube-outline" size={42} />
      <Copy title>A place for your stuff. A simple way to find it.</Copy>
      <Copy muted>Save first. Organize when it helps.</Copy>
      <Panel>
        <Copy style={{ fontWeight: '700' }}>One item, four useful ideas</Copy>
        <Copy>Item: your camping spatula.</Copy>
        <Copy>
          Place: Garage → Camping box. This is where it physically lives.
        </Copy>
        <Copy>
          Folder: Camping kit. This is your own group of belongings, even when
          they live in different places.
        </Copy>
        <Copy>
          Category: Kitchen & Dining. This describes what kind of object it is.
        </Copy>
      </Panel>
      <Section title="Nothing needs a folder" />
      <Copy>
        Unfiled and Uncategorized are normal. A name and a place or exact spot
        are enough to save. Tags, photographs, and descriptions are optional.
      </Copy>
      <Section title="Kitchen isn’t a separate app" />
      <Copy>
        Pin your Kitchen place to Home, or filter Kitchen & Dining items
        wherever they are stored. You can keep using the same search for every
        kind of belonging.
      </Copy>
      <Section title="Moving vs. organizing" />
      <Copy>
        Move Item records a physical move. Change Folder only changes your
        organization. Folder changes never add a location-history entry.
      </Copy>
      <Section title="Private by design" />
      <Copy>
        Items are saved on this device. There is no mandatory account, cloud
        sync, or live tracking. Item-Nesia remembers the last place you
        recorded.
      </Copy>
      <Copy muted>Item-Nesia · 1.0.0 · Offline-first</Copy>
    </Screen>
  );
}
