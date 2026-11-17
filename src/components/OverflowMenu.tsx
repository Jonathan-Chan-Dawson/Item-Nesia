import { useState } from 'react';
import { ChoiceSheet, type Choice } from './controls';
import { IconButton } from './ui';
export function OverflowMenu({
  title,
  options,
  onSelect,
}: {
  title: string;
  options: Choice[];
  onSelect(value: string): void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        icon="ellipsis-horizontal"
        label={`${title} actions`}
        onPress={() => setOpen(true)}
      />
      <ChoiceSheet
        visible={open}
        title={title}
        options={options}
        onSelect={onSelect}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
