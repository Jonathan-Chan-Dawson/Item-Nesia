import { Copy, Header, Icon, Panel, Screen, Section } from '../components/ui';
export default function About() {
  return (
    <Screen>
      <Header title="About Item-Nesia" />
      <Icon name="cube-outline" size={56} />
      <Copy title>Snap it. Stash it. Find it.</Copy>
      <Copy muted>Your backup memory for physical belongings.</Copy>
      <Section title="How it works" />
      <Panel>
        <Copy>1. Take a photo of something you want to remember.</Copy>
        <Copy>2. Save its place and a little detail about the exact spot.</Copy>
        <Copy>3. Search when you need it. Future you says thanks.</Copy>
      </Panel>
      <Section title="Private by design" />
      <Copy>
        Your items stay on this device. There’s no account, analytics, or cloud
        sync. Item-Nesia remembers the last location you recorded; it cannot
        detect when an item moves.
      </Copy>
      <Copy muted>
        Demo items are labeled examples. They don’t represent belongings you’ve
        saved.
      </Copy>
      <Copy muted>Item-Nesia · 1.0.0 · Foundation build</Copy>
    </Screen>
  );
}
